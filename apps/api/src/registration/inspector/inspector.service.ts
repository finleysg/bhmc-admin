import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common"
import type { MySql2Database } from "drizzle-orm/mysql2"
import { z } from "zod"

import { getAmount } from "@repo/domain/functions"
import {
	NotificationTypeChoices,
	RegistrationStatusChoices,
	type InspectedPayment,
	type InspectorSearchResult,
	type RegistrationInspection,
	type RegistrationStatusValue,
	type StripeCheck,
} from "@repo/domain/types"

import { AuditService, type AuditContext } from "../../audit"
import { DrizzleService, toDbString, type PaymentRow, type RefundRow } from "../../database"
import { toEventFee } from "../../events"
import { parseBody } from "../../events/setup/event-setup.schemas"
import { StripeService } from "../../stripe/stripe.service"
import { toPlayer } from "../mappers"
import { ChangeLogService } from "../services/changelog.service"
import { RefundService } from "../services/refund.service"
import { RegistrationBroadcastService } from "../services/registration-broadcast.service"

import { InspectorRepository } from "./inspector.repository"
import {
	checkPayment,
	checkRefund,
	isPaymentIntentId,
	isStripeRefundId,
	notStripe,
	refundNotSent,
	stripeError,
} from "./stripe-check"

const slotStatusSchema = z.object({
	status: z.enum([
		RegistrationStatusChoices.RESERVED,
		RegistrationStatusChoices.AVAILABLE,
		RegistrationStatusChoices.UNAVAILABLE,
	]),
})

const addFeeSchema = z.union([
	z.object({
		eventFeeId: z.number().int().positive(),
		waived: z.literal(true),
	}),
	z.object({
		eventFeeId: z.number().int().positive(),
		waived: z.literal(false).optional(),
		paidBy: z.string().trim().min(1, "Say how it was paid").max(40),
	}),
])

const WAIVED = "Waived"

/** Statuses of a slot whose hold expires. */
const HELD: string[] = [
	RegistrationStatusChoices.PENDING,
	RegistrationStatusChoices.AWAITING_PAYMENT,
]

const money = (amount: string) => Number(amount)

/**
 * The Registration Inspector: everything about one registration in one view, with a live
 * Stripe check, and targeted repairs recorded in the admin audit history.
 */
@Injectable()
export class InspectorService {
	constructor(
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
		@Inject(InspectorRepository) private readonly repository: InspectorRepository,
		@Inject(AuditService) private readonly audit: AuditService,
		@Inject(StripeService) private readonly stripe: StripeService,
		@Inject(RefundService) private readonly refunds: RefundService,
		@Inject(ChangeLogService) private readonly changeLog: ChangeLogService,
		@Inject(RegistrationBroadcastService)
		private readonly broadcast: RegistrationBroadcastService,
	) {}

	async search(eventId: number, text: string): Promise<InspectorSearchResult[]> {
		const rows = await this.repository.searchRegistrations(eventId, text.trim())
		const names = await this.repository.findPlayerNamesByRegistration(
			rows.map((r) => r.registrationId),
		)
		return rows.map((r) => ({
			...r,
			players: names
				.filter((n) => n.registrationId === r.registrationId)
				.map((n) => `${n.firstName} ${n.lastName}`),
		}))
	}

	async inspect(eventId: number, registrationId: number): Promise<RegistrationInspection> {
		const found = await this.repository.findRegistration(registrationId)
		if (!found || found.registration.eventId !== eventId) {
			throw new NotFoundException(`Registration ${registrationId} not found in event ${eventId}`)
		}
		const { registration: reg, event: evt, courseName } = found

		const [slotRows, changeLog, eventFees] = await Promise.all([
			this.repository.findSlots(registrationId),
			this.repository.findChangeLog(registrationId),
			this.repository.findEventFees(evt.id),
		])
		const feeRows = await this.repository.findFeesOfSlots(slotRows.map((s) => s.slot.id))
		const paymentRows = await this.repository.findPayments(
			[...new Set(feeRows.map((f) => f.fee.paymentId))],
			evt.id,
			reg.userId,
		)
		const refundRows = await this.repository.findRefunds(paymentRows.map((p) => p.id))
		const payments = await Promise.all(
			paymentRows.map((p) =>
				this.inspectPayment(
					p,
					refundRows.filter((r) => r.paymentId === p.id),
				),
			),
		)

		const slots = slotRows.map(({ slot, firstName, lastName, holeNumber, sessionName }) => ({
			id: slot.id,
			status: slot.status as RegistrationStatusValue,
			playerId: slot.playerId,
			playerName: firstName === null ? null : `${firstName} ${lastName}`,
			holeNumber,
			startingOrder: slot.startingOrder,
			slot: slot.slot,
			sessionName,
			fees: feeRows
				.filter((f) => f.fee.registrationSlotId === slot.id)
				.map(({ fee, feeTypeName }) => ({
					id: fee.id,
					eventFeeId: fee.eventFeeId,
					feeTypeName,
					amount: money(fee.amount),
					isPaid: Boolean(fee.isPaid),
					paymentId: fee.paymentId,
				})),
		}))

		return {
			id: reg.id,
			eventId: evt.id,
			eventName: evt.name,
			startDate: evt.startDate,
			canChoose: Boolean(evt.canChoose),
			courseName,
			userId: reg.userId,
			signedUpBy: reg.signedUpBy,
			createdDate: reg.createdDate,
			expires: reg.expires,
			holdExpired:
				reg.expires !== null &&
				reg.expires < toDbString(new Date()) &&
				slots.some((s) => HELD.includes(s.status)),
			notes: reg.notes,
			slots,
			payments,
			changeLog: changeLog.map(({ entry, actorFirstName, actorLastName }) => ({
				id: entry.id,
				action: entry.action,
				actorName: `${actorFirstName} ${actorLastName}`,
				isAdmin: Boolean(entry.isAdmin),
				details: entry.details,
				createdDate: entry.createdDate,
			})),
			eventFees: eventFees.map(({ fee, feeTypeName }) => ({
				id: fee.id,
				feeTypeName,
				amount: money(fee.amount),
				isRequired: Boolean(fee.isRequired),
			})),
		}
	}

	private async inspectPayment(row: PaymentRow, refunds: RefundRow[]): Promise<InspectedPayment> {
		const isStripe = isPaymentIntentId(row.paymentCode)
		const [stripe, refundChecks] = isStripe
			? await Promise.all([
					this.checkPaymentIntent(row, refunds),
					Promise.all(refunds.map((r) => this.checkStripeRefund(r))),
				])
			: [notStripe, refunds.map(() => notStripe)]
		return {
			id: row.id,
			paymentCode: row.paymentCode,
			paymentKey: row.paymentKey,
			amount: money(row.paymentAmount),
			transactionFee: money(row.transactionFee),
			confirmed: Boolean(row.confirmed),
			paymentDate: row.paymentDate,
			confirmDate: row.confirmDate,
			stripe,
			stripeUrl: isStripe ? this.stripe.paymentDashboardUrl(row.paymentCode) : null,
			refunds: refunds.map((r, i) => ({
				id: r.id,
				refundCode: r.refundCode,
				amount: money(r.refundAmount),
				confirmed: Boolean(r.confirmed),
				refundDate: r.refundDate,
				notes: r.notes,
				stripe: refundChecks[i],
			})),
		}
	}

	private async checkPaymentIntent(row: PaymentRow, refunds: RefundRow[]): Promise<StripeCheck> {
		try {
			return checkPayment(row, refunds, await this.stripe.retrievePaymentIntent(row.paymentCode))
		} catch (error) {
			return stripeError(error)
		}
	}

	private async checkStripeRefund(row: RefundRow): Promise<StripeCheck> {
		if (!isStripeRefundId(row.refundCode)) return refundNotSent
		try {
			return checkRefund(row, await this.stripe.retrieveRefund(row.refundCode))
		} catch (error) {
			return stripeError(error)
		}
	}

	// ==================== REPAIRS ====================

	/**
	 * Sets a slot to Reserved, Available, or Unavailable. Reserved needs a player on the
	 * slot. Available and Unavailable free the slot: the player and registration are
	 * removed and unpaid fees detached. Freeing is refused while a payment for the slot
	 * could still be collected (see `assertNoPaymentInFlight`), or if a fee is paid.
	 */
	async setSlotStatus(
		eventId: number,
		slotId: number,
		body: unknown,
		context: AuditContext,
	): Promise<void> {
		const { status } = parseBody(slotStatusSchema, body)
		// Stripe is asked before the transaction, so no lock is held during the call.
		const canceledIntents =
			status === RegistrationStatusChoices.RESERVED
				? new Set<string>()
				: await this.canceledPaymentIntents(slotId)
		const canChoose = await this.drizzle.db.transaction(async (tx) => {
			const slot = await this.repository.lockSlot(tx, slotId)
			if (!slot || slot.eventId !== eventId) {
				throw new NotFoundException(`Slot ${slotId} not found in event ${eventId}`)
			}
			const canChoose = await this.repository.findCanChoose(tx, eventId)
			const before: Record<string, unknown> = {
				status: slot.status,
				playerId: slot.playerId,
				registrationId: slot.registrationId,
			}
			const after: Record<string, unknown> = { status }

			if (status === RegistrationStatusChoices.RESERVED) {
				if (slot.playerId === null || slot.registrationId === null) {
					throw new BadRequestException(
						"Only a slot with a player and registration can be Reserved",
					)
				}
				await this.repository.updateSlot(tx, slotId, { status })
			} else {
				if (!canChoose) {
					throw new BadRequestException(
						"Players don't choose slots for this event. Drop the player in Player Management instead.",
					)
				}
				const fees = await this.repository.lockFeesOfSlot(tx, slotId)
				if (fees.some((f) => f.isPaid)) {
					throw new ConflictException(
						"The slot has paid fees. Drop the player (with a refund if due) in Player Management instead.",
					)
				}
				await this.assertNoPaymentInFlight(tx, slot.registrationId, slotId, canceledIntents)
				await this.repository.detachFees(
					tx,
					fees.map((f) => f.id),
				)
				await this.repository.updateSlot(tx, slotId, {
					status,
					playerId: null,
					registrationId: null,
				})
				Object.assign(after, { playerId: null, registrationId: null })
				if (fees.length) {
					before.feeIds = fees.map((f) => f.id)
					after.feeIds = []
				}
			}

			await this.audit.record(tx, context, {
				operation: "registration.slot.status",
				entityType: "registration_slot",
				entityId: slotId,
				eventId,
				before,
				after,
			})
			return canChoose
		})
		if (canChoose) this.broadcast.notifyChange(eventId)
	}

	/**
	 * The slot's unconfirmed Stripe payments whose PaymentIntent Stripe reports canceled.
	 * Any other status (processing, succeeded, or still payable) is refused: the charge
	 * could still be collected, and confirming it would mark the detached fees paid with
	 * no slot for the player.
	 */
	private async canceledPaymentIntents(slotId: number): Promise<Set<string>> {
		const payments = await this.repository.findPaymentsOfSlot(this.drizzle.db, slotId, false)
		const canceled = new Set<string>()
		for (const p of payments) {
			if (p.confirmed || !isPaymentIntentId(p.paymentCode)) continue
			let status: string
			try {
				status = (await this.stripe.retrievePaymentIntent(p.paymentCode)).status
			} catch (error) {
				throw new ConflictException(
					`Could not check payment ${p.id} with Stripe: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
			if (status !== "canceled") {
				throw new ConflictException(
					`Payment ${p.id} is still open in Stripe (${status}). Let it confirm, or cancel it in the Stripe dashboard, then try again.`,
				)
			}
			canceled.add(p.paymentCode)
		}
		return canceled
	}

	/**
	 * Refuses to free a slot while one of its unconfirmed payments could still be paid: a
	 * Stripe payment not checked as canceled (it may have started since the check), or a
	 * payment without a PaymentIntent while the registration's hold is running (the player
	 * may still be checking out).
	 */
	private async assertNoPaymentInFlight(
		tx: MySql2Database,
		registrationId: number | null,
		slotId: number,
		canceledIntents: Set<string>,
	): Promise<void> {
		const open = (await this.repository.findPaymentsOfSlot(tx, slotId, true)).filter(
			(p) => !p.confirmed,
		)
		if (open.some((p) => isPaymentIntentId(p.paymentCode) && !canceledIntents.has(p.paymentCode))) {
			throw new ConflictException("A payment for the slot changed. Try again.")
		}
		if (!open.some((p) => !isPaymentIntentId(p.paymentCode)) || registrationId === null) return
		const expires = await this.repository.findRegistrationExpires(tx, registrationId)
		if (expires !== null && expires > toDbString(new Date())) {
			throw new ConflictException(
				`The player may still be paying. Try again after the hold expires (${expires} UTC).`,
			)
		}
	}

	/**
	 * Adds an event fee to a player's slot, recorded as paid outside Stripe: a confirmed
	 * payment whose code says how it was paid. The amount is the player's amount for the
	 * fee (the session's fee, else the override when it applies, else the fee); a waived
	 * fee is recorded at $0, so it adds nothing to the money collected.
	 *
	 * Only for a Reserved slot of a registration with no Pending or Awaiting payment
	 * slots: expiry cleanup deletes every payment of such a registration.
	 */
	async addFee(
		eventId: number,
		slotId: number,
		body: unknown,
		context: AuditContext,
	): Promise<void> {
		const values = parseBody(addFeeSchema, body)
		const { eventFeeId } = values
		const paidBy = values.waived ? WAIVED : values.paidBy
		await this.drizzle.db.transaction(async (tx) => {
			const slot = await this.repository.lockSlot(tx, slotId)
			if (!slot || slot.eventId !== eventId) {
				throw new NotFoundException(`Slot ${slotId} not found in event ${eventId}`)
			}
			if (slot.playerId === null || slot.registrationId === null) {
				throw new BadRequestException("Fees can only be added to a slot with a player")
			}
			if (slot.status !== RegistrationStatusChoices.RESERVED) {
				throw new ConflictException("Fees can only be added to a Reserved slot")
			}
			const groupSlots = await this.repository.lockSlotsOfRegistration(tx, slot.registrationId)
			if (groupSlots.some((s) => HELD.includes(s.status))) {
				throw new ConflictException(
					"The registration is still being paid for (a slot is Pending or Awaiting payment). Resolve that first.",
				)
			}
			const fee = await this.repository.findEventFee(tx, eventFeeId)
			if (!fee || fee.eventId !== eventId) {
				throw new BadRequestException(`Event fee ${eventFeeId} is not a fee of this event`)
			}
			const existing = await this.repository.lockFeesOfSlot(tx, slotId)
			if (existing.some((f) => f.eventFeeId === eventFeeId)) {
				throw new ConflictException("The player already has this fee")
			}

			const playerRow = await this.repository.findPlayer(tx, slot.playerId)
			const sessionFee = slot.sessionId
				? await this.repository.findSessionFee(tx, slot.sessionId, eventFeeId)
				: null
			const startDate = await this.repository.findEventStartDate(tx, eventId)
			const amount = values.waived
				? 0
				: sessionFee
					? Number(sessionFee.amount)
					: getAmount(toEventFee(fee), toPlayer(playerRow), new Date(startDate))

			const userId =
				(await this.repository.findRegistrationUserId(tx, slot.registrationId)) ?? playerRow.userId
			if (userId === null) {
				throw new BadRequestException("Neither the registration nor the player has a user account")
			}

			const now = toDbString(new Date())
			const paymentId = await this.repository.insertPayment(tx, {
				paymentCode: paidBy,
				paymentKey: "admin",
				notificationType: NotificationTypeChoices.ADMIN,
				confirmed: 1,
				eventId,
				userId,
				paymentAmount: amount.toFixed(2),
				transactionFee: "0.00",
				paymentDate: now,
				confirmDate: now,
			})
			const feeId = await this.repository.insertFee(tx, {
				isPaid: 1,
				eventFeeId,
				paymentId,
				registrationSlotId: slotId,
				amount: amount.toFixed(2),
			})

			await this.audit.record(tx, context, {
				operation: "registration.fee.add",
				entityType: "registration_fee",
				entityId: feeId,
				eventId,
				before: {},
				after: { registrationSlotId: slotId, eventFeeId, amount, paymentId, paidBy },
			})
		})
	}

	/**
	 * Removes a fee from its slot. The fee stays on its payment, detached from the slot, as
	 * a drop leaves it. With `refund`, a paid fee is first refunded through Stripe; only
	 * fees of Stripe payments can be refunded this way.
	 */
	async removeFee(
		eventId: number,
		feeId: number,
		refund: boolean,
		context: AuditContext,
	): Promise<void> {
		// Checked before refunding: the refund runs in its own transaction and calls Stripe,
		// so it cannot run while this transaction holds the fee's lock.
		const db = this.drizzle.db
		const current = await this.repository.findSlotFee(db, feeId, false)
		if (!current || current.eventId !== eventId) {
			throw new NotFoundException(`Fee ${feeId} not found on a slot in event ${eventId}`)
		}
		const { fee } = current
		let registrationId: number | null = null
		if (refund) {
			if (!fee.isPaid)
				throw new BadRequestException("The fee is not paid, so there is nothing to refund")
			const paymentRow = await this.repository.findPayment(db, fee.paymentId)
			if (!paymentRow || !isPaymentIntentId(paymentRow.paymentCode)) {
				throw new BadRequestException(
					"The fee was not paid through Stripe. Remove it without a refund and settle it directly.",
				)
			}
			registrationId = await this.changeLog.resolveRegistrationIdFromFeeId(feeId)
			await this.refunds.processRefunds(
				[{ paymentId: fee.paymentId, registrationFeeIds: [feeId] }],
				context.actorId,
			)
		}

		await this.drizzle.db.transaction(async (tx) => {
			const locked = await this.repository.findSlotFee(tx, feeId, true)
			if (!locked || locked.eventId !== eventId) {
				throw new ConflictException(`Fee ${feeId} was removed from its slot by another change`)
			}
			await this.repository.detachFees(tx, [feeId])
			await this.audit.record(tx, context, {
				operation: "registration.fee.remove",
				entityType: "registration_fee",
				entityId: feeId,
				eventId,
				before: {
					registrationSlotId: fee.registrationSlotId,
					isPaid: Boolean(fee.isPaid),
					refunded: false,
				},
				after: { registrationSlotId: null, isPaid: Boolean(locked.fee.isPaid), refunded: refund },
			})
		})

		if (refund && registrationId !== null) {
			void this.changeLog.log({
				eventId,
				registrationId,
				action: "refund",
				actorId: context.actorId,
				isAdmin: true,
				details: { amount: fee.amount, paymentId: fee.paymentId },
			})
		}
	}
}

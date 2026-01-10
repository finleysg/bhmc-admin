import { and, eq, inArray, ne } from "drizzle-orm"

import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { calculateAmountDue, dummyHole, getAmount } from "@repo/domain/functions"
import {
	AdminRegistration,
	AdminRegistrationSlot,
	Player,
	RegistrationStatusChoices,
	RegistrationStatusValue,
	CompleteClubEvent,
	CompleteRegistration,
	EventTypeChoices,
	AmountDue,
	ClubEvent,
	CompletePayment,
	CompleteRegistrationAndPayment,
} from "@repo/domain/types"

import {
	DrizzleService,
	payment,
	registration,
	registrationFee,
	registrationSlot,
	toDbString,
} from "../../database"
import { EventsService } from "../../events"
import { MailService } from "../../mail/mail.service"
import { toCompleteRegistration, toPayment, toPlayer } from "../mappers"
import { RegistrationRepository } from "../repositories/registration.repository"
import { RegistrationBroadcastService } from "./registration-broadcast.service"
import { EventFullError, SlotConflictError } from "../errors"
import { DjangoAuthService } from "../../auth"
import { CoursesService } from "../../courses"
import { PaymentsRepository } from "../repositories/payments.repository"

type ActualFeeAmount = {
	eventFeeId: number
	amount: number
}
type AdminRegistrationSlotWithAmount = Omit<AdminRegistrationSlot, "feeIds"> & {
	amounts: ActualFeeAmount[]
}

@Injectable()
export class AdminRegistrationService {
	private readonly logger = new Logger(AdminRegistrationService.name)

	constructor(
		private drizzle: DrizzleService,
		private repository: RegistrationRepository,
		private paymentsRepository: PaymentsRepository,
		private readonly auth: DjangoAuthService,
		private readonly courses: CoursesService,
		private readonly events: EventsService,
		private readonly mailService: MailService,
		private readonly broadcast: RegistrationBroadcastService,
	) {}

	/** Create registration on behalf of a user. */
	async createAdminRegistration(
		eventId: number,
		dto: AdminRegistration,
	): Promise<{ registrationId: number; paymentId: number }> {
		const eventRecord = await this.events.getCompleteClubEventById(eventId, false)

		const convertedSlots = await this.convertSlots(eventRecord, dto.slots)
		const allAmounts = convertedSlots.flatMap((slot) => slot.amounts.map((a) => a.amount))
		const totalAmountDue = calculateAmountDue(allAmounts)

		const expires = new Date()
		expires.setHours(expires.getHours() + dto.expires)

		if (eventRecord.canChoose) {
			const { registrationId, paymentId } = await this.createChooseableRegistration(
				eventId,
				expires,
				totalAmountDue,
				convertedSlots,
				dto,
			)
			this.broadcast.notifyChange(eventId)

			return { registrationId, paymentId }
		} else {
			const { registrationId, paymentId } = await this.createNonChoosableRegistration(
				eventRecord,
				expires,
				totalAmountDue,
				convertedSlots,
				dto,
			)

			// Membership registration?
			if (eventRecord.eventType === EventTypeChoices.SEASON_REGISTRATION) {
				const season = new Date(eventRecord.startDate).getFullYear()
				for (const slot of convertedSlots) {
					await this.updateMembershipStatus(slot.playerId, season)
				}
			}

			return { registrationId, paymentId }
		}
	}

	/** Send payment request email to user. */
	async sendPaymentRequestNotification(
		eventId: number,
		registrationId: number,
		paymentId: number,
		collectPayment: boolean,
	): Promise<void> {
		const event = await this.events.getCompleteClubEventById(eventId)
		const registrationRecord = await this.repository.findRegistrationFullById(registrationId)
		const course = registrationRecord.courseId
			? await this.courses.findCourseWithHolesById(registrationRecord.courseId)
			: undefined
		const user = await this.auth.findById(registrationRecord.userId!)

		if (!user) {
			throw new BadRequestException("Inconceivable! No user found for the notification.")
		}

		const eventFeeMap = new Map(event.eventFees.map((ef) => [ef.id, ef]))
		const holeMap = new Map(course?.holes.map((h) => [h.id, h]) ?? [])

		const registrationComplete: CompleteRegistration = {
			id: registrationRecord.id,
			eventId: registrationRecord.eventId,
			notes: registrationRecord.notes ?? undefined,
			courseId: registrationRecord.courseId ?? undefined,
			course: course
				? { ...course, tees: [] }
				: { id: -1, name: "dummy", numberOfHoles: 0, holes: [], tees: [] },
			signedUpBy: registrationRecord.signedUpBy ?? "",
			userId: registrationRecord.userId ?? 0,
			expires: registrationRecord.expires ?? undefined,
			ggId: registrationRecord.ggId ?? undefined,
			createdDate: registrationRecord.createdDate,
			slots: registrationRecord.slots.map((slot) => ({
				id: slot.id,
				registrationId: slot.registrationId ?? 0,
				eventId: slot.eventId,
				startingOrder: slot.startingOrder,
				slot: slot.slot,
				status: slot.status as RegistrationStatusValue,
				holeId: slot.holeId ?? undefined,
				hole: holeMap.get(slot.holeId!) ?? dummyHole(),
				playerId: slot.playerId ?? undefined,
				player: toPlayer(slot.player!),
				ggId: slot.ggId ?? undefined,
				fees: (slot.fees ?? []).map((fee) => ({
					id: fee.id,
					registrationSlotId: fee.registrationSlotId ?? 0,
					paymentId: fee.paymentId,
					amount: parseFloat(fee.amount),
					isPaid: Boolean(fee.isPaid),
					eventFeeId: fee.eventFeeId,
					eventFee: eventFeeMap.get(fee.eventFeeId)!,
				})),
			})),
		}

		await this.mailService.sendAdminRegistrationNotification(
			event,
			registrationComplete,
			paymentId,
			user.email,
			collectPayment,
		)
	}

	/** Mark player as member for season. */
	async updateMembershipStatus(userId: number, season: number): Promise<void> {
		const player = await this.repository.findPlayerByUserId(userId)
		if (player) {
			player.isMember = 1
			player.lastSeason = season
			await this.repository.updatePlayer(player.id, player)
		}
	}

	/**
	 * Retrieve a fully validated CompleteRegistrationAndPayment.
	 * Throws NotFoundException if registration or payment not found.
	 */
	async getCompleteRegistrationAndPayment(
		registrationId: number,
		paymentId: number,
	): Promise<CompleteRegistrationAndPayment> {
		const regRow = await this.repository.findCompleteRegistrationById(registrationId)

		if (!regRow) {
			throw new NotFoundException(`Registration ${registrationId} not found`)
		}

		const completeRegistration = toCompleteRegistration(regRow)

		const paymentRow = await this.paymentsRepository.findPaymentById(paymentId)

		if (!paymentRow) {
			throw new NotFoundException(`Payment ${paymentId} not found`)
		}

		const allFees = completeRegistration.slots.flatMap((slot) => slot.fees)
		const completePayment: CompletePayment = {
			...toPayment(paymentRow),
			details: allFees,
		}

		return {
			registration: completeRegistration,
			payment: completePayment,
		}
	}

	/** Convert admin slots to slots with calculated fee amounts. */
	private async convertSlots(
		eventRecord: CompleteClubEvent,
		slots: AdminRegistrationSlot[],
	): Promise<AdminRegistrationSlotWithAmount[]> {
		const startDate = new Date(eventRecord.startDate)
		const convertedSlots: AdminRegistrationSlotWithAmount[] = []

		const playerIds = Array.from(new Set(slots.map((slot) => slot.playerId)))
		const players = await this.repository.findPlayersByIds(playerIds)
		const playerLookup = new Map<number, Player>(players.map((p) => [p.id, toPlayer(p)]))

		for (const slot of slots) {
			const convertedSlot: AdminRegistrationSlotWithAmount = {
				...slot,
				amounts: [],
			}
			const player = playerLookup.get(slot.playerId)
			const eventFees = eventRecord.eventFees.filter((ef) => slot.feeIds.includes(ef.id))
			convertedSlot.amounts = eventFees.map((ef) => {
				const playerAmount = getAmount(ef, player ?? ({} as Player), startDate)
				return { eventFeeId: ef.id, amount: playerAmount }
			})
			convertedSlots.push(convertedSlot)
		}
		return convertedSlots
	}

	/** Create registration for slot-selection events. */
	private async createChooseableRegistration(
		eventId: number,
		expires: Date,
		amountDue: AmountDue,
		slotAmounts: AdminRegistrationSlotWithAmount[],
		dto: AdminRegistration,
	): Promise<{ registrationId: number; paymentId: number }> {
		let registrationId = 0
		let paymentId = 0

		await this.drizzle.db.transaction(async (tx) => {
			const slotIds = dto.slots.map((s) => s.slotId)
			const slots = await tx
				.select()
				.from(registrationSlot)
				.where(inArray(registrationSlot.id, slotIds))
				.for("update") // Row-level lock

			// Validate all slots are AVAILABLE
			for (const slot of slots) {
				if (slot.status !== RegistrationStatusChoices.AVAILABLE) {
					throw new SlotConflictError()
				}
			}

			const [result] = await tx.insert(registration).values({
				eventId: eventId,
				userId: dto.userId,
				courseId: dto.courseId,
				signedUpBy: dto.signedUpBy,
				expires: toDbString(expires),
				createdDate: toDbString(new Date()),
			})
			registrationId = Number(result.insertId)

			const paymentCode = dto.collectPayment ? "Requested" : "Waived"
			const [paymentResult] = await tx.insert(payment).values({
				paymentCode,
				eventId,
				userId: dto.userId,
				paymentAmount: amountDue.total.toFixed(2),
				transactionFee: amountDue.transactionFee.toFixed(2),
				confirmed: 0,
				notificationType: "A",
			})
			paymentId = Number(paymentResult.insertId)

			for (const slot of slotAmounts) {
				await tx
					.update(registrationSlot)
					.set({
						registrationId,
						status: RegistrationStatusChoices.AWAITING_PAYMENT,
						playerId: slot.playerId,
						holeId: dto.startingHoleId,
						startingOrder: dto.startingOrder,
					})
					.where(eq(registrationSlot.id, slot.slotId))

				for (const fee of slot.amounts) {
					await tx.insert(registrationFee).values({
						isPaid: 0,
						eventFeeId: fee.eventFeeId,
						paymentId,
						registrationSlotId: slot.slotId,
						amount: fee.amount.toFixed(2),
					})
				}
			}
		})

		return { registrationId, paymentId }
	}

	/** Create registration for non-slot-selection events. */
	private async createNonChoosableRegistration(
		event: ClubEvent,
		expires: Date,
		amountDue: AmountDue,
		slotAmounts: AdminRegistrationSlotWithAmount[],
		dto: AdminRegistration,
	): Promise<{ registrationId: number; paymentId: number }> {
		let registrationId = 0
		let paymentId = 0

		await this.drizzle.db.transaction(async (tx) => {
			// Lock all reserved/pending/awaiting slots for this event
			const lockedSlots = await tx
				.select({ id: registrationSlot.id })
				.from(registrationSlot)
				.where(
					and(
						eq(registrationSlot.eventId, event.id),
						inArray(registrationSlot.status, [
							RegistrationStatusChoices.PENDING,
							RegistrationStatusChoices.AWAITING_PAYMENT,
							RegistrationStatusChoices.RESERVED,
						]),
					),
				)
				.for("update")

			// Capacity check
			if (event.registrationMaximum) {
				if (lockedSlots.length + slotAmounts.length > event.registrationMaximum) {
					throw new EventFullError()
				}
			}

			// If this user already started a registration, create a new one
			// and let the system cleanup process deal with a stale registration
			const [existing] = await tx
				.select()
				.from(registration)
				.where(and(eq(registration.userId, dto.userId), eq(registration.eventId, event.id)))

			if (existing) {
				await tx.update(registration).set({ userId: null }).where(eq(registration.id, existing.id))
				await tx
					.update(registrationSlot)
					.set({ playerId: null, registrationId: null })
					.where(
						and(
							eq(registrationSlot.registrationId, existing.id),
							ne(registrationSlot.status, RegistrationStatusChoices.RESERVED), // just in case the user completed a registration
						),
					)
			}

			const [result] = await tx.insert(registration).values({
				eventId: event.id,
				userId: dto.userId,
				signedUpBy: dto.signedUpBy,
				expires: toDbString(expires),
				createdDate: toDbString(new Date()),
			})
			registrationId = Number(result.insertId)

			const paymentCode = dto.collectPayment ? "Requested" : "Waived"
			const [paymentResult] = await tx.insert(payment).values({
				paymentCode,
				eventId: event.id,
				userId: dto.userId,
				paymentAmount: amountDue.total.toFixed(2),
				transactionFee: amountDue.transactionFee.toFixed(2),
				confirmed: 0,
				notificationType: "A",
			})
			paymentId = Number(paymentResult.insertId)

			// Create new slots
			for (const slot of slotAmounts) {
				const [result] = await tx.insert(registrationSlot).values({
					eventId: event.id,
					playerId: slot.playerId,
					registrationId,
					status: RegistrationStatusChoices.PENDING,
					startingOrder: 1,
					slot: 0,
				})
				const slotId = result.insertId

				for (const fee of slot.amounts) {
					await tx.insert(registrationFee).values({
						isPaid: 0,
						eventFeeId: fee.eventFeeId,
						paymentId,
						registrationSlotId: slotId,
						amount: fee.amount.toFixed(2),
					})
				}
			}
		})

		return { registrationId, paymentId }
	}
}

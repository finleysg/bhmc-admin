import { Injectable, Logger } from "@nestjs/common"
import { eq, inArray } from "drizzle-orm"
import Stripe from "stripe"

import {
	DjangoUser,
	Payment,
	RegistrationStatusChoices,
	PaymentWithDetails,
	CompleteRegistrationFee,
} from "@repo/domain/types"

import {
	authUser,
	DrizzleService,
	payment,
	refund,
	registrationFee,
	registrationSlot,
	toDbString,
} from "../database"
import { EventsService } from "../events"
import { MailService } from "../mail"
import {
	RegistrationRepository,
	RegistrationService,
	toRegistrationFeeWithEventFee,
} from "../registration"

@Injectable()
export class StripeWebhookService {
	private readonly logger = new Logger(StripeWebhookService.name)

	constructor(
		private drizzle: DrizzleService,
		private registrationRepository: RegistrationRepository,
		private registrationService: RegistrationService,
		private eventsService: EventsService,
		private mailService: MailService,
	) {}

	async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
		const paymentIntentId = paymentIntent.id
		this.logger.log(`Processing payment_intent.succeeded: ${paymentIntentId}`)

		// Find payment by paymentCode (stores "pi_*" before confirmation)
		const [paymentRecord] = await this.drizzle.db
			.select()
			.from(payment)
			.where(eq(payment.paymentCode, paymentIntentId))
			.limit(1)

		if (!paymentRecord) {
			this.logger.warn(`No payment found for paymentIntent ${paymentIntentId}`)
			return
		}

		// Already confirmed? Skip (idempotency)
		if (paymentRecord.confirmed) {
			this.logger.log(`Payment ${paymentRecord.id} already confirmed, skipping`)
			return
		}

		const now = toDbString(new Date())

		await this.drizzle.db.transaction(async (tx) => {
			// 1. Update payment: confirmed=1, confirmDate
			await tx
				.update(payment)
				.set({
					confirmed: 1,
					confirmDate: now,
					paymentDate: now,
				})
				.where(eq(payment.id, paymentRecord.id))

			// 2. Get all registrationFees for this payment
			const fees = await tx
				.select()
				.from(registrationFee)
				.where(eq(registrationFee.paymentId, paymentRecord.id))

			if (fees.length === 0) {
				this.logger.warn(`No registration fees found for payment ${paymentRecord.id}`)
				return
			}

			// 3. Update registrationFee: isPaid=1
			const feeIds = fees.map((f) => f.id)
			await tx.update(registrationFee).set({ isPaid: 1 }).where(inArray(registrationFee.id, feeIds))

			// 4. Get unique slot IDs and update status X -> R
			const slotIds = [
				...new Set(fees.map((f) => f.registrationSlotId).filter(Boolean)),
			] as number[]
			if (slotIds.length > 0) {
				await tx
					.update(registrationSlot)
					.set({ status: RegistrationStatusChoices.RESERVED })
					.where(inArray(registrationSlot.id, slotIds))
			}
		})

		// 5. Send confirmation email (outside transaction)
		await this.sendConfirmationEmail(paymentRecord.id, paymentRecord.eventId, paymentRecord.userId)
	}

	handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): void {
		this.logger.log(`Payment failed: ${paymentIntent.id}`)
		// TODO: Notify admin or update payment status
	}

	async handleRefundCreated(refundEvent: Stripe.Refund): Promise<void> {
		const refundId = refundEvent.id
		const paymentIntentId =
			typeof refundEvent.payment_intent === "string"
				? refundEvent.payment_intent
				: refundEvent.payment_intent?.id
		const reason = refundEvent.reason ?? "requested_by_customer"
		const amount = refundEvent.amount / 100 // cents to dollars

		this.logger.log(`Processing refund.created: ${refundId} for payment ${paymentIntentId}`)

		if (!paymentIntentId) {
			this.logger.error(`Refund ${refundId} has no payment_intent`)
			return
		}

		// Find payment by paymentCode
		const [paymentRecord] = await this.drizzle.db
			.select()
			.from(payment)
			.where(eq(payment.paymentCode, paymentIntentId))
			.limit(1)

		if (!paymentRecord) {
			this.logger.error(`Refund created but no payment found for ${paymentIntentId}`)
			return
		}

		// Check if refund already exists (idempotency)
		const [existingRefund] = await this.drizzle.db
			.select()
			.from(refund)
			.where(eq(refund.refundCode, refundId))
			.limit(1)

		if (existingRefund) {
			this.logger.log(`Refund ${refundId} already exists, skipping creation`)
			return
		}

		// Get or create system user for issuer
		const systemUserId = await this.getOrCreateSystemUser()

		// Create refund record
		const now = toDbString(new Date())
		await this.drizzle.db.insert(refund).values({
			refundCode: refundId,
			refundAmount: amount.toFixed(2),
			notes: reason,
			confirmed: 0,
			refundDate: now,
			issuerId: systemUserId,
			paymentId: paymentRecord.id,
		})

		this.logger.log(`Refund record created: ${refundId}`)

		// Send refund notification email
		await this.sendRefundNotificationEmail(
			paymentRecord.userId,
			paymentRecord.eventId,
			amount,
			refundId,
		)
	}

	async handleRefundUpdated(refundEvent: Stripe.Refund): Promise<void> {
		const refundId = refundEvent.id
		this.logger.log(`Processing refund.updated: ${refundId}, status: ${String(refundEvent.status)}`)

		// Only process if status is succeeded
		if (refundEvent.status !== "succeeded") {
			this.logger.log(`Refund ${refundId} status is ${String(refundEvent.status)}, not confirming`)
			return
		}

		// Find refund by refundCode
		const [refundRecord] = await this.drizzle.db
			.select()
			.from(refund)
			.where(eq(refund.refundCode, refundId))
			.limit(1)

		if (!refundRecord) {
			// Race condition: updated event arrived before created handler finished
			this.logger.warn(`Refund ${refundId} not found - created handler may not have finished`)
			return
		}

		// Already confirmed? Skip
		if (refundRecord.confirmed) {
			this.logger.log(`Refund ${refundId} already confirmed, skipping`)
			return
		}

		// Update refund: confirmed = true
		await this.drizzle.db.update(refund).set({ confirmed: 1 }).where(eq(refund.id, refundRecord.id))

		this.logger.log(`Refund ${refundId} confirmed`)
	}

	private async getOrCreateSystemUser(): Promise<number> {
		const systemUsername = "stripe_system"

		const [existingUser] = await this.drizzle.db
			.select()
			.from(authUser)
			.where(eq(authUser.username, systemUsername))
			.limit(1)

		if (existingUser) {
			return existingUser.id
		}

		// Create system user
		const now = toDbString(new Date())
		const [result] = await this.drizzle.db.insert(authUser).values({
			username: systemUsername,
			email: "stripe@system.local",
			password: "",
			firstName: "Stripe",
			lastName: "System",
			isActive: 0,
			isStaff: 0,
			isSuperuser: 0,
			dateJoined: now,
		})

		return Number(result.insertId)
	}

	private async sendRefundNotificationEmail(
		userId: number,
		eventId: number,
		refundAmount: number,
		refundCode: string,
	): Promise<void> {
		try {
			// Get user
			const [userRow] = await this.drizzle.db
				.select()
				.from(authUser)
				.where(eq(authUser.id, userId))
				.limit(1)

			if (!userRow) {
				this.logger.warn(`User ${userId} not found for refund notification`)
				return
			}

			// Get event
			const event = await this.eventsService.getCompleteClubEventById(eventId, false)

			const userName = `${userRow.firstName} ${userRow.lastName}`
			await this.mailService.sendRefundNotification(
				userRow.email,
				userName,
				event,
				refundAmount,
				refundCode,
			)

			this.logger.log(`Refund notification email sent for ${refundCode}`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			this.logger.error(`Failed to send refund notification email: ${message}`)
			// Don't throw - email failure shouldn't fail the webhook
		}
	}

	private async sendConfirmationEmail(
		paymentId: number,
		eventId: number,
		userId: number,
	): Promise<void> {
		try {
			// Get user from authUser table
			const [userRow] = await this.drizzle.db
				.select()
				.from(authUser)
				.where(eq(authUser.id, userId))
				.limit(1)

			if (!userRow) {
				this.logger.warn(`User ${userId} not found for confirmation email`)
				return
			}

			const user: DjangoUser = {
				id: userRow.id,
				email: userRow.email,
				firstName: userRow.firstName,
				lastName: userRow.lastName,
				isActive: Boolean(userRow.isActive),
				isStaff: Boolean(userRow.isStaff),
				ghin: null,
				birthDate: null,
			}

			// Get event
			const event = await this.eventsService.getCompleteClubEventById(eventId, false)

			// Get fees with slot info to find the registration
			const fees = await this.registrationRepository.findRegistrationFeesByPayment(paymentId)
			if (fees.length === 0) {
				this.logger.warn(`No fees found for payment ${paymentId}`)
				return
			}

			const firstFee = fees[0]
			const slotId = firstFee.registrationSlotId
			const slot = await this.registrationRepository.findRegistrationSlotById(slotId)

			if (!slot.playerId) {
				this.logger.warn(`Slot ${slotId} has no player`)
				return
			}

			// Get validated registration
			const registration = await this.registrationService.findGroup(eventId, slot.playerId)

			// Build validated payment with fee details
			const paymentWithDetails =
				await this.registrationRepository.findPaymentWithDetailsById(paymentId)
			if (!paymentWithDetails) {
				this.logger.warn(`Payment ${paymentId} not found with details`)
				return
			}

			// Get fees with eventFee data for PaymentWithDetails
			const slotIds = fees.map((f) => f.registrationSlotId)
			const feesWithEventFee =
				await this.registrationRepository.findFeesWithEventFeeAndFeeType(slotIds)

			const validatedFees: CompleteRegistrationFee[] = feesWithEventFee
				.filter((f) => f.eventFee && f.feeType)
				.map(
					(f) =>
						toRegistrationFeeWithEventFee(
							f as {
								fee: typeof f.fee
								eventFee: NonNullable<typeof f.eventFee>
								feeType: NonNullable<typeof f.feeType>
							},
						) as CompleteRegistrationFee,
				)

			const PaymentWithDetails: PaymentWithDetails = {
				id: paymentWithDetails.payment.id,
				paymentCode: paymentWithDetails.payment.paymentCode,
				paymentKey: paymentWithDetails.payment.paymentKey ?? null,
				notificationType: paymentWithDetails.payment
					.notificationType as Payment["notificationType"],
				confirmed: Boolean(paymentWithDetails.payment.confirmed),
				eventId: paymentWithDetails.payment.eventId,
				userId: paymentWithDetails.payment.userId,
				paymentAmount: parseFloat(paymentWithDetails.payment.paymentAmount),
				transactionFee: parseFloat(paymentWithDetails.payment.transactionFee),
				paymentDate: paymentWithDetails.payment.paymentDate ?? new Date().toISOString(),
				confirmDate: paymentWithDetails.payment.confirmDate ?? null,
				paymentDetails: validatedFees,
			}

			await this.mailService.sendRegistrationConfirmation(
				user,
				event,
				registration,
				PaymentWithDetails,
			)
			this.logger.log(`Confirmation email sent for payment ${paymentId}`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			this.logger.error(`Failed to send confirmation email: ${message}`)
			// Don't throw - email failure shouldn't fail the webhook
		}
	}
}

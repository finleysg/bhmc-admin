import { Injectable, Logger } from "@nestjs/common"
import { eq, inArray } from "drizzle-orm"
import Stripe from "stripe"

import {
	DjangoUser,
	Payment,
	RegistrationStatusChoices,
	ValidatedPayment,
	ValidatedRegistrationFee,
} from "@repo/domain/types"

import {
	authUser,
	DrizzleService,
	payment,
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

	handleRefundCreated(refundEvent: Stripe.Refund): void {
		this.logger.log(`Refund created: ${refundEvent.id}`)
		// TODO: Update refund record status
	}

	handleRefundUpdated(refundEvent: Stripe.Refund): void {
		this.logger.log(`Refund updated: ${refundEvent.id}, status: ${String(refundEvent.status)}`)
		// TODO: Update confirmed status based on refund.status
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
			const event = await this.eventsService.getValidatedClubEventById(eventId, false)

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

			// Get fees with eventFee data for ValidatedPayment
			const slotIds = fees.map((f) => f.registrationSlotId)
			const feesWithEventFee =
				await this.registrationRepository.findFeesWithEventFeeAndFeeType(slotIds)

			const validatedFees: ValidatedRegistrationFee[] = feesWithEventFee
				.filter((f) => f.eventFee && f.feeType)
				.map(
					(f) =>
						toRegistrationFeeWithEventFee(
							f as {
								fee: typeof f.fee
								eventFee: NonNullable<typeof f.eventFee>
								feeType: NonNullable<typeof f.feeType>
							},
						) as ValidatedRegistrationFee,
				)

			const validatedPayment: ValidatedPayment = {
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
				validatedPayment,
			)
			this.logger.log(`Confirmation email sent for payment ${paymentId}`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			this.logger.error(`Failed to send confirmation email: ${message}`)
			// Don't throw - email failure shouldn't fail the webhook
		}
	}
}

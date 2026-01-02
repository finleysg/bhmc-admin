import { Injectable, Logger } from "@nestjs/common"
import Stripe from "stripe"

import { CompletePayment, CompleteRegistration } from "@repo/domain/types"

import { DjangoAuthService } from "../auth"
import { EventsService } from "../events"
import { MailService } from "../mail"
import { AdminRegistrationService } from "../registration"

@Injectable()
export class StripeWebhookService {
	private readonly logger = new Logger(StripeWebhookService.name)

	constructor(
		private adminRegistrationService: AdminRegistrationService,
		private djangoAuthService: DjangoAuthService,
		private eventsService: EventsService,
		private mailService: MailService,
	) {}

	async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
		const paymentIntentId = paymentIntent.id
		this.logger.log(`Processing payment_intent.succeeded: ${paymentIntentId}`)

		const paymentRecord =
			await this.adminRegistrationService.findPaymentByPaymentCode(paymentIntentId)

		if (!paymentRecord) {
			this.logger.warn(`No payment found for paymentIntent ${paymentIntentId}`)
			return
		}

		if (paymentRecord.confirmed) {
			this.logger.log(`Payment ${paymentRecord.id} already confirmed, skipping`)
			return
		}

		const registrationId = paymentIntent.metadata?.registrationId
			? parseInt(paymentIntent.metadata.registrationId, 10)
			: null

		if (!registrationId) {
			this.logger.warn(`No registrationId found for payment ${paymentRecord.id}`)
			return
		}

		await this.adminRegistrationService.paymentConfirmed(registrationId, paymentRecord.id)

		const result = await this.adminRegistrationService.getCompleteRegistrationAndPayment(
			registrationId,
			paymentRecord.id,
		)

		await this.sendConfirmationEmail(result.registration, result.payment)
	}

	handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): void {
		this.logger.log(`Payment failed: ${paymentIntent.id}`)
	}

	async handleRefundCreated(refundEvent: Stripe.Refund): Promise<void> {
		const refundId = refundEvent.id
		const paymentIntentId =
			typeof refundEvent.payment_intent === "string"
				? refundEvent.payment_intent
				: refundEvent.payment_intent?.id
		const reason = refundEvent.reason ?? "requested_by_customer"
		const amount = refundEvent.amount / 100

		this.logger.log(`Processing refund.created: ${refundId} for payment ${paymentIntentId}`)

		if (!paymentIntentId) {
			this.logger.error(`Refund ${refundId} has no payment_intent`)
			return
		}

		const paymentRecord =
			await this.adminRegistrationService.findPaymentByPaymentCode(paymentIntentId)

		if (!paymentRecord) {
			this.logger.error(`Refund created but no payment found for ${paymentIntentId}`)
			return
		}

		const existingRefund = await this.adminRegistrationService.findRefundByRefundCode(refundId)

		if (existingRefund) {
			this.logger.log(`Refund ${refundId} already exists, skipping creation`)
			return
		}

		const systemUserId = await this.djangoAuthService.getOrCreateSystemUser("stripe_system")

		await this.adminRegistrationService.createRefund({
			refundCode: refundId,
			refundAmount: amount,
			notes: reason,
			issuerId: systemUserId,
			paymentId: paymentRecord.id,
		})

		this.logger.log(`Refund record created: ${refundId}`)

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

		if (refundEvent.status !== "succeeded") {
			this.logger.log(`Refund ${refundId} status is ${String(refundEvent.status)}, not confirming`)
			return
		}

		await this.adminRegistrationService.confirmRefund(refundId)
		this.logger.log(`Refund ${refundId} confirmed`)
	}

	private async sendRefundNotificationEmail(
		userId: number,
		eventId: number,
		refundAmount: number,
		refundCode: string,
	): Promise<void> {
		try {
			const user = await this.djangoAuthService.findById(userId)

			if (!user) {
				this.logger.warn(`User ${userId} not found for refund notification`)
				return
			}

			const event = await this.eventsService.getCompleteClubEventById(eventId, false)

			const userName = `${user.firstName} ${user.lastName}`
			await this.mailService.sendRefundNotification(
				user.email,
				userName,
				event,
				refundAmount,
				refundCode,
			)

			this.logger.log(`Refund notification email sent for ${refundCode}`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			this.logger.error(`Failed to send refund notification email: ${message}`)
		}
	}

	private async sendConfirmationEmail(
		registration: CompleteRegistration,
		payment: CompletePayment,
	): Promise<void> {
		try {
			const user = await this.djangoAuthService.findById(payment.userId)

			if (!user) {
				this.logger.warn(`User ${payment.userId} not found for confirmation email`)
				return
			}

			const event = await this.eventsService.getCompleteClubEventById(payment.eventId, false)

			await this.mailService.sendRegistrationConfirmation(user, event, registration, payment)
			this.logger.log(`Confirmation email sent for payment ${payment.id}`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			this.logger.error(`Failed to send confirmation email: ${message}`)
		}
	}
}

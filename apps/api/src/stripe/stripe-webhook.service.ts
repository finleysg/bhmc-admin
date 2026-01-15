import { Inject, Injectable, Logger } from "@nestjs/common"
import Stripe from "stripe"

import { EventTypeChoices, NotificationTypeChoices } from "@repo/domain/types"

import { wrapError } from "../common/errors"
import { DjangoAuthService } from "../auth"
import { EventsService } from "../events"
import { MailService } from "../mail"
import { AdminRegistrationService, PaymentsService, RefundService } from "../registration"

@Injectable()
export class StripeWebhookService {
	private readonly logger = new Logger(StripeWebhookService.name)

	constructor(
		@Inject(AdminRegistrationService) private adminRegistrationService: AdminRegistrationService,
		@Inject(PaymentsService) private paymentsService: PaymentsService,
		@Inject(RefundService) private refundService: RefundService,
		@Inject(DjangoAuthService) private djangoAuthService: DjangoAuthService,
		@Inject(EventsService) private eventsService: EventsService,
		@Inject(MailService) private mailService: MailService,
	) {}

	async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
		const paymentIntentId = paymentIntent.id
		this.logger.log(`Processing payment_intent.succeeded: ${paymentIntentId}`)

		const paymentRecord = await this.paymentsService.findPaymentByPaymentCode(paymentIntentId)

		if (!paymentRecord) {
			this.logger.warn(`No payment found for paymentIntent ${paymentIntentId}`)
			return
		}

		if (paymentRecord.confirmed) {
			this.logger.log(`Payment ${paymentRecord.id} already confirmed, skipping`)
			return
		}

		this.logger.log(`Payment intent metadata: ${JSON.stringify(paymentIntent.metadata)}`)

		const registrationId = paymentIntent.metadata?.registrationId
			? parseInt(paymentIntent.metadata.registrationId, 10)
			: null

		if (!registrationId) {
			this.logger.error(`No registrationId provided for payment ${paymentRecord.id}`)
			return
		}

		await this.paymentsService.paymentConfirmed(registrationId, paymentRecord.id)

		await this.sendConfirmationEmail(registrationId, paymentRecord.id)
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

		const paymentRecord = await this.paymentsService.findPaymentByPaymentCode(paymentIntentId)

		if (!paymentRecord) {
			this.logger.error(`Refund created but no payment found for ${paymentIntentId}`)
			return
		}

		const existingRefund = await this.refundService.findRefundByRefundCode(refundId)

		if (existingRefund) {
			this.logger.log(`Refund ${refundId} already exists, skipping creation`)
			return
		}

		const systemUserId = await this.djangoAuthService.getOrCreateSystemUser("stripe_system")

		await this.refundService.createRefund({
			refundCode: refundId,
			refundAmount: amount,
			notes: reason,
			issuerId: systemUserId,
			paymentId: paymentRecord.id,
		})

		this.logger.log(`Refund record created: ${refundId}`)
	}

	async handleRefundUpdated(refundEvent: Stripe.Refund): Promise<void> {
		const refundId = refundEvent.id
		const amount = refundEvent.amount / 100

		this.logger.log(
			`Processing refund.updated: ${refundId}, status: ${String(refundEvent.status)}, amount: ${amount}`,
		)

		if (refundEvent.status !== "succeeded") {
			this.logger.log(`Refund ${refundId} status is ${String(refundEvent.status)}, not confirming`)
			return
		}

		await this.refundService.confirmRefund(refundId)
		this.logger.log(`Refund ${refundId} confirmed`)

		const paymentIntentId =
			typeof refundEvent.payment_intent === "string"
				? refundEvent.payment_intent
				: refundEvent.payment_intent?.id
		if (!paymentIntentId) {
			this.logger.error(
				`Refund ${refundId} has no payment_intent, so cannot send notification email.`,
			)
			return
		}

		const paymentRecord = await this.paymentsService.findPaymentByPaymentCode(paymentIntentId)
		if (!paymentRecord) {
			this.logger.error(
				`Refund created but no payment found for ${paymentIntentId}, so cannot send notification email.`,
			)
			return
		}

		await this.sendRefundNotificationEmail(
			paymentRecord.userId,
			paymentRecord.eventId,
			amount,
			refundId,
		)
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

			const userName = `${user.firstName} ${user.lastName}`
			this.logger.log(`Sending refund notification for ${refundCode} to ${userName}`)

			const event = await this.eventsService.getCompleteClubEventById(eventId, false)

			await this.mailService.sendRefundNotification(
				user.email,
				userName,
				event,
				refundAmount,
				refundCode,
			)

			this.logger.log(`Refund notification email sent for ${refundCode}`)
		} catch (error) {
			const wrapped = wrapError(error, `sendRefundNotification for refund ${refundCode}`)
			this.logger.error({ message: wrapped.message, cause: wrapped.cause, stack: wrapped.stack })
		}
	}

	private async sendConfirmationEmail(registrationId: number, paymentId: number): Promise<void> {
		try {
			const { registration, payment } =
				await this.adminRegistrationService.getCompleteRegistrationAndPayment(
					registrationId,
					paymentId,
				)

			const user = await this.djangoAuthService.findById(payment.userId)

			if (!user) {
				this.logger.warn(`User ${payment.userId} not found for confirmation email`)
				return
			}

			const event = await this.eventsService.getCompleteClubEventById(payment.eventId, false)
			const year = new Date(event.startDate).getFullYear().toString()

			if (event.eventType === EventTypeChoices.SEASON_REGISTRATION) {
				await this.adminRegistrationService.updateMembershipStatus(user.id, +year)
			}

			this.logger.log(
				`Sending confirmation email for notification type ${payment.notificationType} to ${user.email}.`,
			)

			switch (payment.notificationType) {
				case NotificationTypeChoices.RETURNING_MEMBER:
					await this.mailService.sendWelcomeBackEmail(
						{ firstName: user.firstName, email: user.email },
						year,
					)
					break
				case NotificationTypeChoices.NEW_MEMBER:
					await this.mailService.sendWelcomeEmail(
						{ firstName: user.firstName, email: user.email },
						year,
					)
					break
				case NotificationTypeChoices.MATCH_PLAY:
					await this.mailService.sendMatchPlayEmail(
						{ firstName: user.firstName, email: user.email },
						year,
					)
					break
				case NotificationTypeChoices.UPDATED_REGISTRATION:
					await this.mailService.sendRegistrationUpdate(user, event, registration, payment)
					break
				case NotificationTypeChoices.SIGNUP_CONFIRMATION:
					await this.mailService.sendRegistrationConfirmation(user, event, registration, payment)
					break
				case NotificationTypeChoices.ADMIN:
					// The admin flows take care of notifications
					this.logger.log(`No email sent for admin payment ${payment.id} to ${user.email}.`)
					break
				default:
					this.logger.warn(`Missing notification type for payment ${payment.id} to ${user.email}.`)
			}

			this.logger.log(`Confirmation email sent for payment ${payment.id} to ${user.email}.`)
		} catch (error) {
			const wrapped = wrapError(error, `sendConfirmationEmail for payment ${paymentId}`)
			this.logger.error({ message: wrapped.message, cause: wrapped.cause, stack: wrapped.stack })
		}
	}
}

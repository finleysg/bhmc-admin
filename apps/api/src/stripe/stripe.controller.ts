import {
	Controller,
	Post,
	Headers,
	RawBody,
	HttpCode,
	HttpStatus,
	BadRequestException,
	Logger,
} from "@nestjs/common"
import Stripe from "stripe"

import { StripeService } from "./stripe.service"
import { StripeWebhookService } from "./stripe-webhook.service"

@Controller("stripe")
export class StripeController {
	private readonly logger = new Logger(StripeController.name)

	constructor(
		private readonly stripeService: StripeService,
		private readonly webhookService: StripeWebhookService,
	) {}

	@Post("webhook")
	@HttpCode(HttpStatus.OK)
	async handleWebhook(
		@Headers("stripe-signature") signature: string,
		@RawBody() rawBody: Buffer,
	): Promise<{ received: boolean }> {
		if (!signature) {
			throw new BadRequestException("Missing stripe-signature header")
		}

		let event: Stripe.Event
		try {
			event = this.stripeService.constructWebhookEvent(rawBody, signature)
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			this.logger.error(`Webhook signature verification failed: ${message}`)
			throw new BadRequestException("Invalid webhook signature")
		}

		this.logger.log(`Received Stripe event: ${event.type}`)

		switch (event.type) {
			case "payment_intent.succeeded":
				await this.webhookService.handlePaymentIntentSucceeded(event.data.object)
				break
			case "payment_intent.payment_failed":
				this.webhookService.handlePaymentIntentFailed(event.data.object)
				break
			case "refund.created":
				this.webhookService.handleRefundCreated(event.data.object)
				break
			case "refund.updated":
				this.webhookService.handleRefundUpdated(event.data.object)
				break
			default:
				this.logger.log(`Unhandled event type: ${event.type}`)
		}

		return { received: true }
	}
}

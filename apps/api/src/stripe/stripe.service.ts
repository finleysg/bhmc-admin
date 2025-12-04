import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import Stripe from "stripe"

@Injectable()
export class StripeService {
	private stripe: Stripe

	constructor(private configService: ConfigService) {
		const secretKey = this.configService.get<string>("STRIPE_SECRET_KEY")
		if (!secretKey) {
			throw new Error("STRIPE_SECRET_KEY environment variable is required")
		}
		const apiVersion = this.configService.get<string>("STRIPE_API_VERSION", "2024-12-18.acacia") as Stripe.LatestApiVersion
		this.stripe = new Stripe(secretKey, { apiVersion })
	}

	/**
	 * Creates a refund using the Stripe SDK
	 * @param paymentIntentId The Stripe Payment Intent ID to refund
	 * @param amount Optional amount to refund (in dollars). If not provided, full refund is created
	 * @returns The Stripe refund ID
	 */
	async createRefund(paymentIntentId: string, amount?: number): Promise<string> {
		// Input validation
		if (!paymentIntentId || paymentIntentId.trim() === "") {
			throw new Error("Payment Intent ID is required")
		}
		if (!paymentIntentId.startsWith("pi_")) {
			throw new Error("Invalid Payment Intent ID")
		}
		if (amount !== undefined && amount <= 0) {
			throw new Error("Refund amount must be positive")
		}

		const refundParams: Stripe.RefundCreateParams = {
			payment_intent: paymentIntentId,
		}

		if (amount !== undefined) {
			refundParams.amount = Math.round(amount * 100) // Convert dollars to cents
		}

		const refund = await this.stripe.refunds.create(refundParams)
		return refund.id
	}
}

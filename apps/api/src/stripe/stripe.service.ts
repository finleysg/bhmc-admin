import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import Stripe from "stripe"

import { calculateAmountDue } from "@repo/domain/functions"
import { AmountDue, PaymentIntentMetadata, PaymentIntentResult } from "@repo/domain/types"

@Injectable()
export class StripeService {
	private stripe: Stripe
	private webhookSecret: string

	constructor(private configService: ConfigService) {
		const secretKey = this.configService.get<string>("STRIPE_SECRET_KEY")
		if (!secretKey) {
			throw new Error("STRIPE_SECRET_KEY environment variable is required")
		}
		const apiVersion = this.configService.get<string>(
			"STRIPE_API_VERSION",
			"2025-12-15.clover",
		) as Stripe.LatestApiVersion
		this.stripe = new Stripe(secretKey, { apiVersion })
		this.webhookSecret = this.configService.getOrThrow<string>("STRIPE_WEBHOOK_SECRET")
	}

	constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
		return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret)
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

	/**
	 * Creates a PaymentIntent for collecting payment
	 * @param amountCents Amount in cents
	 * @param description Description for the payment
	 * @param metadata Metadata to attach to the PaymentIntent
	 * @param customerId Optional Stripe customer ID for saved payment methods
	 * @param email Customer email for receipt
	 * @returns PaymentIntent ID and client secret
	 */
	async createPaymentIntent(
		amountCents: number,
		description: string,
		metadata: PaymentIntentMetadata,
		customerId?: string,
		email?: string,
	): Promise<PaymentIntentResult> {
		if (amountCents <= 0) {
			throw new Error("Payment amount must be positive")
		}

		const params: Stripe.PaymentIntentCreateParams = {
			amount: amountCents,
			currency: "usd",
			description,
			metadata: {
				eventId: String(metadata.eventId),
				registrationId: String(metadata.registrationId),
				paymentId: String(metadata.paymentId),
				userName: metadata.userName,
				userEmail: metadata.userEmail,
				eventName: metadata.eventName,
				eventStartDate: metadata.eventStartDate,
			},
			automatic_payment_methods: { enabled: true },
		}

		if (customerId) {
			params.customer = customerId
		}

		if (email) {
			params.receipt_email = email
		}

		const paymentIntent = await this.stripe.paymentIntents.create(params)

		if (!paymentIntent.client_secret) {
			throw new Error("Failed to create PaymentIntent: no client secret returned")
		}

		return {
			paymentIntentId: paymentIntent.id,
			clientSecret: paymentIntent.client_secret,
		}
	}

	/**
	 * Cancels a PaymentIntent
	 * @param paymentIntentId The Stripe PaymentIntent ID to cancel
	 */
	async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
		if (!paymentIntentId || !paymentIntentId.startsWith("pi_")) {
			throw new Error("Invalid Payment Intent ID")
		}

		await this.stripe.paymentIntents.cancel(paymentIntentId)
	}

	/**
	 * Creates a new Stripe customer
	 * @param email Customer email
	 * @param name Customer name
	 * @returns Stripe customer ID
	 */
	async createCustomer(email: string, name: string): Promise<string> {
		const customer = await this.stripe.customers.create({
			email,
			name,
		})
		return customer.id
	}

	/**
	 * Creates a customer session for Stripe Elements integration (saved payment methods)
	 * @param customerId Stripe customer ID
	 * @returns Customer session client secret
	 */
	async createCustomerSession(customerId: string): Promise<string> {
		if (!customerId || !customerId.startsWith("cus_")) {
			throw new Error("Invalid Customer ID")
		}

		const session = await this.stripe.customerSessions.create({
			customer: customerId,
			components: {
				payment_element: {
					enabled: true,
					features: {
						payment_method_redisplay: "enabled",
						payment_method_save: "enabled",
						payment_method_save_usage: "on_session",
						payment_method_remove: "enabled",
					},
				},
			},
		})

		if (!session.client_secret) {
			throw new Error("Failed to create customer session: no client secret returned")
		}

		return session.client_secret
	}

	/**
	 * Calculates payment amount with Stripe transaction fees
	 * @param subtotal Amount due before fees (in dollars)
	 * @returns AmountDue with subtotal, transaction fee, and total
	 */
	calculatePaymentAmount(subtotal: number): AmountDue {
		if (subtotal <= 0) {
			return { subtotal: 0, transactionFee: 0, total: 0 }
		}
		return calculateAmountDue([subtotal])
	}
}

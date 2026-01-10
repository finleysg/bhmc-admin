import {
	Body,
	Controller,
	ForbiddenException,
	Get,
	Logger,
	NotFoundException,
	Param,
	ParseIntPipe,
	Post,
	Put,
	Req,
} from "@nestjs/common"

import { AmountDue } from "@repo/domain/types"

import type {
	CreatePaymentIntentRequest,
	CreatePaymentRequest,
	PaymentWithDetails,
	UpdatePaymentRequest,
} from "@repo/domain/types"
import type { AuthenticatedRequest } from "../../auth"
import { PaymentsService } from "../services/payments.service"
import Stripe from "stripe"

interface StripeAmountResponse {
	amountCents: number
	amountDue: AmountDue
}

interface CustomerSessionResponse {
	clientSecret: string
	customerId: string
}

@Controller("payments")
export class UserPaymentsController {
	private readonly logger = new Logger(UserPaymentsController.name)

	constructor(private readonly service: PaymentsService) {}

	/**
	 * Create a payment record with details.
	 * POST /payments
	 */
	@Post()
	async createPayment(
		@Req() req: AuthenticatedRequest,
		@Body() dto: CreatePaymentRequest,
	): Promise<PaymentWithDetails> {
		const user = req.user

		this.logger.log(`Creating payment for user ${user.id} event ${dto.eventId}`)

		const payment = await this.service.createPayment({
			...dto,
			userId: user.id,
		})

		return payment
	}

	/**
	 * Update a payment record.
	 * PUT /payments/:id
	 */
	@Put(":id")
	async updatePayment(
		@Req() req: AuthenticatedRequest,
		@Param("id", ParseIntPipe) paymentId: number,
		@Body() dto: UpdatePaymentRequest,
	): Promise<PaymentWithDetails> {
		const payment = await this.service.findPaymentById(paymentId)
		if (!payment) {
			throw new NotFoundException(`Payment ${paymentId} not found`)
		}

		if (payment.userId !== req.user.id) {
			throw new ForbiddenException("Cannot update payment you do not own")
		}

		this.logger.log(`Updating payment ${paymentId}`)
		const updatedPayment = await this.service.updatePayment(paymentId, dto)

		return updatedPayment
	}

	/**
	 * Create a Stripe PaymentIntent.
	 * POST /payments/:id/payment-intent
	 */
	@Post(":id/payment-intent")
	async createPaymentIntent(
		@Req() req: AuthenticatedRequest,
		@Param("id", ParseIntPipe) paymentId: number,
		@Body() dto: CreatePaymentIntentRequest,
	): Promise<Stripe.PaymentIntent> {
		const payment = await this.service.findPaymentById(paymentId)
		if (!payment) {
			throw new NotFoundException(`Payment ${paymentId} not found`)
		}

		if (payment.userId !== req.user.id) {
			throw new ForbiddenException("Cannot create payment intent for payment you do not own")
		}

		this.logger.log(`Creating payment intent for payment ${paymentId}`)
		return this.service.createPaymentIntent(paymentId, dto.eventId, dto.registrationId)
	}

	/**
	 * Create a customer session for saved payment methods.
	 * POST /payments/customer-session
	 */
	@Post("customer-session")
	async createCustomerSession(@Req() req: AuthenticatedRequest): Promise<CustomerSessionResponse> {
		this.logger.log(`Creating customer session for ${req.user.email}`)

		return this.service.createCustomerSession(req.user.email)
	}

	/**
	 * Get the Stripe amount (in cents) for a payment including fees.
	 * GET /payments/:id/stripe-amount
	 */
	@Get(":id/stripe-amount")
	async getStripeAmount(
		@Req() req: AuthenticatedRequest,
		@Param("id", ParseIntPipe) paymentId: number,
	): Promise<StripeAmountResponse> {
		const payment = await this.service.findPaymentById(paymentId)
		if (!payment) {
			throw new NotFoundException(`Payment ${paymentId} not found`)
		}

		if (payment.userId !== req.user.id) {
			throw new ForbiddenException("Cannot access payment you do not own")
		}

		return this.service.getStripeAmount(paymentId)
	}
}

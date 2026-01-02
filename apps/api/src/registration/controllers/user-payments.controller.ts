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

import { AmountDue, PaymentIntentResult } from "@repo/domain/types"

import type {
	CreatePaymentIntentRequest,
	CreatePaymentRequest,
	UpdatePaymentRequest,
} from "@repo/domain/types"
import type { AuthenticatedRequest } from "../../auth"
import { UserPaymentsService } from "../services/user-payments.service"

interface PaymentResponse {
	paymentId: number
}

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

	constructor(private readonly service: UserPaymentsService) {}

	/**
	 * Create a payment record with details.
	 * POST /payments
	 */
	@Post()
	async createPayment(
		@Req() req: AuthenticatedRequest,
		@Body() dto: CreatePaymentRequest,
	): Promise<PaymentResponse> {
		const user = req.user

		this.logger.log(`Creating payment for user ${user.id} event ${dto.eventId}`)

		const paymentId = await this.service.createPayment({
			...dto,
			userId: user.id,
		})

		return { paymentId }
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
	): Promise<{ success: boolean }> {
		const payment = await this.service.findPaymentById(paymentId)
		if (!payment) {
			throw new NotFoundException(`Payment ${paymentId} not found`)
		}

		if (payment.userId !== req.user.id) {
			throw new ForbiddenException("Cannot update payment you do not own")
		}

		this.logger.log(`Updating payment ${paymentId}`)
		await this.service.updatePayment(paymentId, dto)

		return { success: true }
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
	): Promise<PaymentIntentResult> {
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

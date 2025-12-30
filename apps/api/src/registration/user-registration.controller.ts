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
import { Request } from "express"

import {
	AmountDue,
	DjangoUser,
	PaymentIntentResult,
	RegistrationWithSlots,
} from "@repo/domain/types"

import { CancelRegistration, CreatePayment, UpdatePayment, CreatePaymentIntent } from "./dto"
import type { ReserveRequest } from "./dto"
import { RegistrationFlowService } from "./registration-flow.service"

interface AuthenticatedRequest extends Request {
	user: DjangoUser
}

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

@Controller("registration")
export class UserRegistrationController {
	private readonly logger = new Logger(UserRegistrationController.name)

	constructor(private readonly flowService: RegistrationFlowService) {}

	/**
	 * Create a registration and reserve slots.
	 * POST /registration
	 */
	@Post()
	async createRegistration(
		@Req() req: AuthenticatedRequest,
		@Body() dto: ReserveRequest,
	): Promise<RegistrationWithSlots> {
		const user = req.user

		this.logger.log(`Creating registration for user ${user.id} event ${dto.eventId}`)

		return this.flowService.createAndReserve(user, dto)
	}

	/**
	 * Cancel a registration and release slots.
	 * PUT /registration/:id/cancel
	 */
	@Put(":id/cancel")
	async cancelRegistration(
		@Req() req: AuthenticatedRequest,
		@Param("id", ParseIntPipe) registrationId: number,
		@Body() dto: CancelRegistration,
	): Promise<{ success: boolean }> {
		const reg = await this.flowService.findRegistrationById(registrationId)
		if (!reg) {
			this.logger.log(`Registration ${registrationId} not found for cancel`)
			return { success: true }
		}

		if (reg.userId !== req.user.id) {
			throw new ForbiddenException("Cannot cancel registration you do not own")
		}

		this.logger.log(`Canceling registration ${registrationId}: ${dto.reason}`)
		await this.flowService.cancelRegistration(registrationId, dto.paymentId ?? null, dto.reason)

		return { success: true }
	}

	/**
	 * Create a payment record with details.
	 * POST /payments
	 */
	@Post("payments")
	async createPayment(
		@Req() req: AuthenticatedRequest,
		@Body() dto: CreatePayment,
	): Promise<PaymentResponse> {
		const user = req.user

		this.logger.log(`Creating payment for user ${user.id} event ${dto.eventId}`)

		const paymentId = await this.flowService.createPayment({
			...dto,
			userId: user.id,
		})

		return { paymentId }
	}

	/**
	 * Update a payment record.
	 * PUT /payments/:id
	 */
	@Put("payments/:id")
	async updatePayment(
		@Req() req: AuthenticatedRequest,
		@Param("id", ParseIntPipe) paymentId: number,
		@Body() dto: UpdatePayment,
	): Promise<{ success: boolean }> {
		const payment = await this.flowService.findPaymentById(paymentId)
		if (!payment) {
			throw new NotFoundException(`Payment ${paymentId} not found`)
		}

		if (payment.userId !== req.user.id) {
			throw new ForbiddenException("Cannot update payment you do not own")
		}

		this.logger.log(`Updating payment ${paymentId}`)
		await this.flowService.updatePayment(paymentId, dto)

		return { success: true }
	}

	/**
	 * Create a Stripe PaymentIntent.
	 * POST /payments/:id/payment-intent
	 */
	@Post("payments/:id/payment-intent")
	async createPaymentIntent(
		@Req() req: AuthenticatedRequest,
		@Param("id", ParseIntPipe) paymentId: number,
		@Body() dto: CreatePaymentIntent,
	): Promise<PaymentIntentResult> {
		const payment = await this.flowService.findPaymentById(paymentId)
		if (!payment) {
			throw new NotFoundException(`Payment ${paymentId} not found`)
		}

		if (payment.userId !== req.user.id) {
			throw new ForbiddenException("Cannot create payment intent for payment you do not own")
		}

		this.logger.log(`Creating payment intent for payment ${paymentId}`)
		return this.flowService.createPaymentIntent(paymentId, dto.eventId, dto.registrationId)
	}

	/**
	 * Create a customer session for saved payment methods.
	 * POST /payments/customer-session
	 */
	@Post("payments/customer-session")
	async createCustomerSession(@Req() req: AuthenticatedRequest): Promise<CustomerSessionResponse> {
		this.logger.log(`Creating customer session for ${req.user.email}`)

		return this.flowService.createCustomerSession(req.user.email)
	}

	/**
	 * Get the Stripe amount (in cents) for a payment including fees.
	 * GET /payments/:id/stripe-amount
	 */
	@Get("payments/:id/stripe-amount")
	async getStripeAmount(
		@Req() req: AuthenticatedRequest,
		@Param("id", ParseIntPipe) paymentId: number,
	): Promise<StripeAmountResponse> {
		const payment = await this.flowService.findPaymentById(paymentId)
		if (!payment) {
			throw new NotFoundException(`Payment ${paymentId} not found`)
		}

		if (payment.userId !== req.user.id) {
			throw new ForbiddenException("Cannot access payment you do not own")
		}

		return this.flowService.getStripeAmount(paymentId)
	}
}

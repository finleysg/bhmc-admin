import { Injectable, Logger } from "@nestjs/common"

import { calculateAmountDue, deriveNotificationType } from "@repo/domain/functions"
import {
	AmountDue,
	Payment,
	RegistrationStatusChoices,
	CreatePaymentRequest,
	PaymentDetailRequest,
	UpdatePaymentRequest,
	PaymentWithDetails,
} from "@repo/domain/types"

import { authUser, toDbString, DrizzleService } from "../../database"
import { eq } from "drizzle-orm"
import { EventsService } from "../../events"
import { StripeService } from "../../stripe/stripe.service"

import { PaymentNotFoundError } from "../errors/registration.errors"
import { toPayment, toPaymentWithDetails, toRegistrationFee } from "../mappers"
import { PaymentsRepository } from "../repositories/payments.repository"
import { RegistrationRepository } from "../repositories/registration.repository"
import { RegistrationBroadcastService } from "./registration-broadcast.service"
import Stripe from "stripe"

@Injectable()
export class UserPaymentsService {
	private readonly logger = new Logger(UserPaymentsService.name)

	constructor(
		private readonly paymentRepository: PaymentsRepository,
		private readonly registrationRepository: RegistrationRepository,
		private readonly events: EventsService,
		private readonly stripe: StripeService,
		private readonly drizzle: DrizzleService,
		private readonly broadcast: RegistrationBroadcastService,
	) {}

	/**
	 * Get a payment by ID.
	 */
	async findPaymentById(paymentId: number): Promise<Payment | null> {
		const row = await this.paymentRepository.findPaymentById(paymentId)
		return row ? toPayment(row) : null
	}

	/**
	 * Create a payment record with registration fees.
	 * TODO: wrap in transaction.
	 */
	async createPayment(data: CreatePaymentRequest): Promise<PaymentWithDetails> {
		const { subtotal, transactionFee } = this.calculatePaymentTotal(data.paymentDetails)

		// Derive notification type from event/player context
		const eventFees = await this.events.getEventFeesByEventId(data.eventId)
		const player = await this.registrationRepository.findPlayerByUserId(data.userId)

		const requiredFeeIds = new Set(eventFees.filter((f) => f.isRequired).map((f) => f.id))
		const hasRequiredFees = data.paymentDetails.some((d) => requiredFeeIds.has(d.eventFeeId))

		const notificationType = deriveNotificationType(
			data.eventType,
			player?.lastSeason ?? null,
			hasRequiredFees,
		)
		this.logger.log(
			`Derived a notification type of ${notificationType} for event type ${data.eventType}`,
		)

		const paymentId = await this.paymentRepository.createPayment({
			eventId: data.eventId,
			userId: data.userId,
			notificationType,
			paymentAmount: subtotal.toFixed(2),
			transactionFee: transactionFee.toFixed(2),
			paymentDate: toDbString(new Date()),
			confirmed: 0,
			paymentCode: "pending",
		})

		// Create registration fee records
		for (const detail of data.paymentDetails) {
			await this.paymentRepository.createPaymentDetail({
				eventFeeId: detail.eventFeeId,
				registrationSlotId: detail.registrationSlotId,
				paymentId,
				amount: detail.amount.toFixed(2),
				isPaid: 0,
			})
		}

		const result = await this.paymentRepository.findPaymentWithDetailsById(paymentId)
		return toPaymentWithDetails(result!)
	}

	/**
	 * Update an existing payment record with new details.
	 * TODO: wrap in transaction.
	 */
	async updatePayment(paymentId: number, data: UpdatePaymentRequest): Promise<PaymentWithDetails> {
		const payment = await this.paymentRepository.findPaymentById(paymentId)
		if (!payment) {
			throw new PaymentNotFoundError(paymentId)
		}

		// Delete existing fees
		await this.paymentRepository.deletePaymentDetailsByPayment(paymentId)

		const { subtotal, transactionFee } = this.calculatePaymentTotal(data.paymentDetails)

		// Derive notification type from event/player context
		const event = await this.events.getCompleteClubEventById(data.eventId, false)
		const player = await this.registrationRepository.findPlayerByUserId(data.userId)

		const requiredFeeIds = new Set(event.eventFees.filter((f) => f.isRequired).map((f) => f.id))
		const hasRequiredFees = data.paymentDetails.some((d) => requiredFeeIds.has(d.eventFeeId))

		const notificationType = deriveNotificationType(
			event.eventType,
			player?.lastSeason ?? null,
			hasRequiredFees,
		)

		// Update payment
		await this.paymentRepository.updatePayment(paymentId, {
			paymentAmount: subtotal.toFixed(2),
			transactionFee: transactionFee.toFixed(2),
			notificationType,
		})

		// Create new registration fee records
		for (const detail of data.paymentDetails) {
			await this.paymentRepository.createPaymentDetail({
				eventFeeId: detail.eventFeeId,
				registrationSlotId: detail.registrationSlotId,
				paymentId,
				amount: detail.amount.toFixed(2),
				isPaid: 0,
			})
		}

		const result = await this.paymentRepository.findPaymentWithDetailsById(paymentId)
		return toPaymentWithDetails(result!)
	}

	/**
	 * Typically because a registration is being cancelled or cleaned up (expired)
	 * @param paymentId
	 */
	async deletePaymentAndFees(paymentId: number): Promise<void> {
		await this.paymentRepository.deletePaymentDetailsByPayment(paymentId)
		await this.paymentRepository.deletePayment(paymentId)
	}

	/**
	 * Get the Stripe amount (in cents) for a payment including fees.
	 */
	async getStripeAmount(paymentId: number): Promise<{ amountCents: number; amountDue: AmountDue }> {
		const payment = await this.paymentRepository.findPaymentById(paymentId)
		if (!payment) {
			throw new PaymentNotFoundError(paymentId)
		}

		const feeRows = await this.paymentRepository.findPaymentDetailsByPayment(paymentId)
		const fees = feeRows.map(toRegistrationFee)
		const amountDue = calculateAmountDue(fees.map((f) => f.amount))

		return {
			amountCents: Math.round(amountDue.total * 100),
			amountDue,
		}
	}

	/**
	 * Create a Stripe PaymentIntent and transition to AWAITING_PAYMENT.
	 */
	async createPaymentIntent(
		paymentId: number,
		eventId: number,
		registrationId: number,
	): Promise<Stripe.PaymentIntent> {
		const payment = await this.paymentRepository.findPaymentById(paymentId)
		if (!payment) {
			throw new PaymentNotFoundError(paymentId)
		}

		const event = await this.events.getCompleteClubEventById(eventId, false)
		const { amountCents, amountDue } = await this.getStripeAmount(paymentId)

		// Update payment with calculated amounts
		await this.paymentRepository.updatePayment(paymentId, {
			paymentAmount: amountDue.subtotal.toFixed(2),
			transactionFee: amountDue.transactionFee.toFixed(2),
		})

		// Get user for description and player for Stripe customer
		let userName = "Unknown"
		let email: string | undefined
		let stripeCustomerId: string | undefined
		const [user] = await this.drizzle.db
			.select()
			.from(authUser)
			.where(eq(authUser.id, payment.userId))
			.limit(1)

		if (user) {
			userName = `${user.firstName} ${user.lastName}`
			email = user.email
		}

		// Get player's Stripe customer ID if they have one
		const player = await this.registrationRepository.findPlayerByUserId(payment.userId)
		if (player?.stripeCustomerId) {
			stripeCustomerId = player.stripeCustomerId
		}

		const description = `Online payment for ${event.name} (${event.startDate}) by ${userName}`
		const result = await this.stripe.createPaymentIntent(
			amountCents,
			description,
			{
				eventId,
				registrationId,
				paymentId,
				userName,
				userEmail: email ?? "",
				eventName: event.name,
				eventStartDate: event.startDate,
			},
			stripeCustomerId,
			email,
		)

		// Store payment intent ID
		await this.paymentRepository.updatePaymentIntent(
			paymentId,
			result.id,
			result.client_secret!, // This was validated in the `createPaymentIntent` call
		)

		// Transition slots to AWAITING_PAYMENT
		await this.paymentProcessing(registrationId, eventId)

		return result
	}

	/**
	 * Create or get a Stripe customer session for saved payment methods.
	 */
	async createCustomerSession(
		email: string,
	): Promise<{ clientSecret: string; customerId: string }> {
		const player = await this.registrationRepository.findPlayerByEmail(email)
		if (!player) {
			throw new Error(`No player found with email ${email}`)
		}

		let customerId = player.stripeCustomerId

		// Create new Stripe customer if player doesn't have one
		if (!customerId) {
			customerId = await this.stripe.createCustomer(email, `${player.firstName} ${player.lastName}`)

			// Persist customerId to player record
			await this.registrationRepository.updatePlayer(player.id, { stripeCustomerId: customerId })
		}

		const clientSecret = await this.stripe.createCustomerSession(customerId)

		return { clientSecret, customerId }
	}

	/**
	 * Transition slots from PENDING to AWAITING_PAYMENT.
	 */
	async paymentProcessing(registrationId: number, eventId?: number): Promise<void> {
		const slots = await this.registrationRepository.findSlotsWithStatusByRegistration(
			registrationId,
			[RegistrationStatusChoices.PENDING],
		)

		if (slots.length === 0) return

		const slotIds = slots.map((s) => s.id)
		await this.registrationRepository.updateRegistrationSlots(slotIds, {
			status: RegistrationStatusChoices.AWAITING_PAYMENT,
		})

		// Clear expiry since payment is in progress
		await this.registrationRepository.updateRegistration(registrationId, { expires: null })

		// Notify listeners for canChoose events
		if (eventId) {
			const event = await this.events.getCompleteClubEventById(eventId, false)
			if (event.canChoose) {
				this.broadcast.notifyChange(eventId)
			}
		}
	}

	private calculatePaymentTotal(details: PaymentDetailRequest[]): AmountDue {
		const amounts = details.map((d) => d.amount)
		return calculateAmountDue(amounts)
	}
}

import { Injectable, Logger } from "@nestjs/common"

import { calculateAmountDue } from "@repo/domain/functions"
import {
	AmountDue,
	ClubEvent,
	DjangoUser,
	Payment,
	PaymentIntentResult,
	Registration,
	RegistrationStatusChoices,
	RegistrationSlotWithPlayer,
	RegistrationWithSlots,
} from "@repo/domain/types"

import { authUser, registration, registrationSlot, toDbString, DrizzleService } from "../database"
import { and, eq, inArray } from "drizzle-orm"
import { EventsService } from "../events"
import { StripeService } from "../stripe/stripe.service"

import { CreatePayment, PaymentDetail, UpdatePayment } from "./dto/create-payment"
import { ReserveRequest } from "./dto/create-registration"
import {
	AlreadyRegisteredError,
	CourseRequiredError,
	EventFullError,
	EventRegistrationNotOpenError,
	EventRegistrationWaveError,
	MissingSlotsError,
	PaymentNotFoundError,
	SlotConflictError,
} from "./errors/registration.errors"
import { toPlayer, toRegistrationSlot } from "./mappers"
import { RegistrationRepository } from "./registration.repository"
import { getCurrentWave, getRegistrationWindow, getStartingWave } from "./wave-calculator"

// Expiry times in minutes
const CHOOSABLE_EXPIRY_MINUTES = 5
const NON_CHOOSABLE_EXPIRY_MINUTES = 15

interface ReserveResult {
	registrationId: number
	slotIds: number[]
}

@Injectable()
export class RegistrationFlowService {
	private readonly logger = new Logger(RegistrationFlowService.name)

	constructor(
		private readonly repository: RegistrationRepository,
		private readonly events: EventsService,
		private readonly stripe: StripeService,
		private readonly drizzle: DrizzleService,
	) {}

	// =============================================================================
	// Registration methods
	// =============================================================================

	/**
	 * Create and reserve slots for a registration.
	 * For choosable events, reserves the specified slots.
	 * For non-choosable events, creates new slots on demand.
	 */
	async createAndReserve(
		user: DjangoUser,
		request: ReserveRequest,
	): Promise<RegistrationWithSlots> {
		const signedUpBy = `${user.firstName} ${user.lastName}`
		const event = await this.events.getCompleteClubEventById(request.eventId, false)

		// Validate request
		this.validateRegistrationRequest(event, user.id, request.slotIds, request.courseId ?? null)

		// Calculate expiry
		const expiryMinutes = event.canChoose ? CHOOSABLE_EXPIRY_MINUTES : NON_CHOOSABLE_EXPIRY_MINUTES
		const expires = new Date(Date.now() + expiryMinutes * 60 * 1000)

		let result: ReserveResult
		if (event.canChoose) {
			result = await this.reserveChoosableSlots(
				user.id,
				user.email,
				event,
				request.courseId!,
				request.slotIds,
				signedUpBy,
				expires,
			)
		} else {
			result = await this.createNonChoosableSlots(
				user.id,
				user.email,
				event,
				request.slotIds.length,
				signedUpBy,
				expires,
			)
		}

		return this.buildRegistrationWithSlots(result.registrationId)
	}

	/**
	 * Build RegistrationWithSlots from a registration ID.
	 */
	private async buildRegistrationWithSlots(registrationId: number): Promise<RegistrationWithSlots> {
		const reg = await this.repository.findRegistrationById(registrationId)
		if (!reg) {
			throw new Error(`Registration ${registrationId} not found`)
		}

		const slotRows = await this.repository.findSlotsWithPlayerAndHole(registrationId)
		const slots: RegistrationSlotWithPlayer[] = slotRows.map((row) => {
			const slot = toRegistrationSlot(row.slot)
			return {
				...slot,
				player: row.player ? toPlayer(row.player) : null,
			}
		})

		return {
			...reg,
			slots,
		}
	}

	/**
	 * Get a registration by ID.
	 */
	async findRegistrationById(registrationId: number): Promise<Registration | null> {
		return this.repository.findRegistrationById(registrationId)
	}

	/**
	 * Get a payment by ID.
	 */
	async findPaymentById(paymentId: number): Promise<Payment | null> {
		return this.repository.findPaymentById(paymentId)
	}

	/**
	 * Cancel a registration and release slots.
	 */
	async cancelRegistration(
		registrationId: number,
		paymentId: number | null,
		reason: string,
	): Promise<void> {
		this.logger.log(`Canceling registration ${registrationId}: ${reason}`)

		const reg = await this.repository.findRegistrationById(registrationId)
		if (!reg) return

		const event = await this.events.getCompleteClubEventById(reg.eventId, false)

		// Get slots for this registration
		const slots = await this.repository.findSlotsWithStatusByRegistration(registrationId, [
			RegistrationStatusChoices.PENDING,
			RegistrationStatusChoices.AWAITING_PAYMENT,
			RegistrationStatusChoices.RESERVED,
		])

		if (slots.length === 0) return

		const slotIds = slots.map((s) => s.id)

		if (event.canChoose) {
			// For choosable events, reset slots to AVAILABLE
			await this.repository.updateRegistrationSlots(slotIds, {
				status: RegistrationStatusChoices.AVAILABLE,
				registrationId: null,
				playerId: null,
			})
		} else {
			// For non-choosable events, delete the slots
			await this.repository.deleteRegistrationSlotsByRegistration(registrationId)
		}

		// Delete registration fees if payment exists
		if (paymentId) {
			await this.repository.deleteRegistrationFeesByPayment(paymentId)
		}

		// Delete the registration
		await this.repository.deleteRegistration(registrationId)
	}

	/**
	 * Clean up expired pending registrations.
	 * Called by cron job.
	 */
	async cleanUpExpired(): Promise<number> {
		const now = new Date()
		const expired = await this.repository.findExpiredPendingRegistrations(now)

		if (expired.length === 0) return 0

		this.logger.log(`Cleaning up ${expired.length} expired registrations`)

		for (const reg of expired) {
			await this.cancelRegistration(reg.id, null, "Expired")
		}

		return expired.length
	}

	// =============================================================================
	// Payment methods
	// =============================================================================

	/**
	 * Create a payment record with registration fees.
	 */
	async createPayment(data: CreatePayment): Promise<number> {
		const { subtotal, transactionFee } = this.calculatePaymentTotal(data.paymentDetails)

		const paymentId = await this.repository.createPayment({
			eventId: data.eventId,
			userId: data.userId,
			notificationType: data.notificationType ?? null,
			paymentAmount: subtotal.toFixed(2),
			transactionFee: transactionFee.toFixed(2),
			paymentDate: toDbString(new Date()),
			confirmed: 0,
			paymentCode: "pending",
		})

		// Create registration fee records
		for (const detail of data.paymentDetails) {
			await this.repository.createRegistrationFee({
				eventFeeId: detail.eventFeeId,
				registrationSlotId: detail.registrationSlotId,
				paymentId,
				amount: detail.amount.toFixed(2),
				isPaid: 0,
			})
		}

		return paymentId
	}

	/**
	 * Update an existing payment record with new details.
	 */
	async updatePayment(paymentId: number, data: UpdatePayment): Promise<void> {
		const payment = await this.repository.findPaymentById(paymentId)
		if (!payment) {
			throw new PaymentNotFoundError(paymentId)
		}

		// Delete existing fees
		await this.repository.deleteRegistrationFeesByPayment(paymentId)

		const { subtotal, transactionFee } = this.calculatePaymentTotal(data.paymentDetails)

		// Update payment
		await this.repository.updatePayment(paymentId, {
			paymentAmount: subtotal.toFixed(2),
			transactionFee: transactionFee.toFixed(2),
			notificationType: data.notificationType ?? null,
		})

		// Create new registration fee records
		for (const detail of data.paymentDetails) {
			await this.repository.createRegistrationFee({
				eventFeeId: detail.eventFeeId,
				registrationSlotId: detail.registrationSlotId,
				paymentId,
				amount: detail.amount.toFixed(2),
				isPaid: 0,
			})
		}
	}

	/**
	 * Get the Stripe amount (in cents) for a payment including fees.
	 */
	async getStripeAmount(paymentId: number): Promise<{ amountCents: number; amountDue: AmountDue }> {
		const payment = await this.repository.findPaymentById(paymentId)
		if (!payment) {
			throw new PaymentNotFoundError(paymentId)
		}

		const fees = await this.repository.findRegistrationFeesByPayment(paymentId)
		const feeAmounts = fees.map((f) => f.amount)
		const amountDue = calculateAmountDue(feeAmounts)

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
	): Promise<PaymentIntentResult> {
		const payment = await this.repository.findPaymentById(paymentId)
		if (!payment) {
			throw new PaymentNotFoundError(paymentId)
		}

		const event = await this.events.getCompleteClubEventById(eventId, false)
		const { amountCents, amountDue } = await this.getStripeAmount(paymentId)

		// Update payment with calculated amounts
		await this.repository.updatePayment(paymentId, {
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
		const player = await this.repository.findPlayerByUserId(payment.userId)
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
		await this.repository.updatePaymentIntent(
			paymentId,
			result.paymentIntentId,
			result.clientSecret,
		)

		// Transition slots to AWAITING_PAYMENT
		await this.paymentProcessing(registrationId)

		return result
	}

	/**
	 * Create or get a Stripe customer session for saved payment methods.
	 */
	async createCustomerSession(
		email: string,
	): Promise<{ clientSecret: string; customerId: string }> {
		const player = await this.repository.findPlayerByEmail(email)
		if (!player) {
			throw new Error(`No player found with email ${email}`)
		}

		let customerId = player.stripeCustomerId

		// Create new Stripe customer if player doesn't have one
		if (!customerId) {
			customerId = await this.stripe.createCustomer(email, `${player.firstName} ${player.lastName}`)

			// Persist customerId to player record
			await this.repository.updatePlayer(player.id, { stripeCustomerId: customerId })
		}

		const clientSecret = await this.stripe.createCustomerSession(customerId)

		return { clientSecret, customerId }
	}

	// =============================================================================
	// State transitions
	// =============================================================================

	/**
	 * Transition slots from PENDING to AWAITING_PAYMENT.
	 */
	async paymentProcessing(registrationId: number): Promise<void> {
		const slots = await this.repository.findSlotsWithStatusByRegistration(registrationId, [
			RegistrationStatusChoices.PENDING,
		])

		if (slots.length === 0) return

		const slotIds = slots.map((s) => s.id)
		await this.repository.updateRegistrationSlots(slotIds, {
			status: RegistrationStatusChoices.AWAITING_PAYMENT,
		})

		// Clear expiry since payment is in progress
		await this.repository.updateRegistration(registrationId, { expires: null })
	}

	/**
	 * Transition slots from AWAITING_PAYMENT to RESERVED.
	 * Called by webhook when payment succeeds.
	 */
	async paymentConfirmed(registrationId: number, paymentId: number): Promise<void> {
		const slots = await this.repository.findSlotsWithStatusByRegistration(registrationId, [
			RegistrationStatusChoices.AWAITING_PAYMENT,
		])

		if (slots.length === 0) return

		const slotIds = slots.map((s) => s.id)
		await this.repository.updateRegistrationSlots(slotIds, {
			status: RegistrationStatusChoices.RESERVED,
		})

		// Mark payment as confirmed
		await this.repository.updatePayment(paymentId, {
			confirmed: 1,
			confirmDate: toDbString(new Date()),
		})

		// Mark registration fees as paid
		const fees = await this.repository.findRegistrationFeesByPayment(paymentId)
		const feeIds = fees.map((f) => f.id)
		await this.repository.updateRegistrationFeeStatus(feeIds, true)
	}

	// =============================================================================
	// Internal helpers
	// =============================================================================

	private validateRegistrationRequest(
		event: ClubEvent,
		userId: number,
		slotIds: number[],
		courseId: number | null,
	): void {
		// Check registration window
		const window = getRegistrationWindow(event)
		if (window === "n/a" || window === "future" || window === "past") {
			throw new EventRegistrationNotOpenError()
		}

		// Check wave availability during priority window
		if (window === "priority" && event.signupWaves && event.canChoose) {
			const currentWave = getCurrentWave(event)
			// Wave validation will happen per-slot in reserveChoosableSlots
			if (currentWave === 0) {
				throw new EventRegistrationNotOpenError()
			}
		}

		// Check for existing confirmed registration
		// This is checked in the reserve methods after getting existing registration

		// Check course requirement for choosable events
		if (event.canChoose && !courseId) {
			throw new CourseRequiredError()
		}
	}

	private async reserveChoosableSlots(
		userId: number,
		playerEmail: string,
		event: ClubEvent,
		courseId: number,
		slotIds: number[],
		signedUpBy: string,
		expires: Date,
	): Promise<ReserveResult> {
		// Check for existing registration
		const existing = await this.repository.findRegistrationByUserAndEvent(userId, event.id)
		if (existing) {
			// Check if already has reserved slots
			const reservedSlots = await this.repository.findSlotsWithStatusByRegistration(existing.id, [
				RegistrationStatusChoices.RESERVED,
			])
			if (reservedSlots.length > 0) {
				throw new AlreadyRegisteredError()
			}
		}

		// Get available slots for validation
		const availableSlots = await this.repository.findAvailableSlots(event.id, courseId)
		const availableSlotIds = new Set(availableSlots.map((s) => s.slot.id))
		const availableSlotMap = new Map(availableSlots.map((s) => [s.slot.id, s]))

		// Validate all requested slots are available
		for (const slotId of slotIds) {
			if (!availableSlotIds.has(slotId)) {
				throw new MissingSlotsError()
			}
		}

		// Validate wave restrictions during priority window
		const window = getRegistrationWindow(event)
		if (window === "priority" && event.signupWaves) {
			const currentWave = getCurrentWave(event)
			for (const slotId of slotIds) {
				const slotData = availableSlotMap.get(slotId)!
				const slotWave = getStartingWave(
					event,
					slotData.slot.startingOrder,
					slotData.hole.holeNumber,
				)
				if (slotWave > currentWave) {
					throw new EventRegistrationWaveError(slotWave)
				}
			}
		}

		// Find requesting player to assign to lowest numbered slot
		const requestingPlayer = await this.repository.findPlayerByEmail(playerEmail)
		if (!requestingPlayer) {
			throw new Error(`No player found with email ${playerEmail}`)
		}

		// Determine lowest numbered slot (by slot field)
		const lowestSlotId = slotIds
			.map((id) => ({ id, slot: availableSlotMap.get(id)!.slot.slot }))
			.sort((a, b) => a.slot - b.slot)[0].id

		// Create or update registration
		let registrationId: number
		if (existing) {
			registrationId = existing.id
			await this.repository.updateRegistration(registrationId, {
				courseId,
				expires: toDbString(expires),
			})
		} else {
			registrationId = await this.repository.createRegistration({
				eventId: event.id,
				userId,
				courseId,
				signedUpBy,
				expires: toDbString(expires),
				createdDate: toDbString(new Date()),
			})
		}

		// Optimistic concurrency control to reserve slots
		await this.drizzle.db.transaction(async (tx) => {
			const slots = await tx
				.select()
				.from(registrationSlot)
				.where(inArray(registrationSlot.id, slotIds))
				.for("update") // Row-level lock

			// Validate all slots are AVAILABLE
			for (const slot of slots) {
				if (slot.status !== RegistrationStatusChoices.AVAILABLE) {
					throw new SlotConflictError()
				}
			}

			// Assign requesting player to lowest numbered slot
			await tx
				.update(registrationSlot)
				.set({
					status: RegistrationStatusChoices.PENDING,
					registrationId,
					playerId: requestingPlayer.id,
				})
				.where(eq(registrationSlot.id, lowestSlotId))

			// Reserve other slots without player assignment
			const otherSlotIds = slotIds.filter((id) => id !== lowestSlotId)
			if (otherSlotIds.length > 0) {
				await tx
					.update(registrationSlot)
					.set({ status: RegistrationStatusChoices.PENDING, registrationId })
					.where(inArray(registrationSlot.id, otherSlotIds))
			}
		})

		return { registrationId, slotIds }
	}

	private async createNonChoosableSlots(
		userId: number,
		playerEmail: string,
		event: ClubEvent,
		slotCount: number,
		signedUpBy: string,
		expires: Date,
	): Promise<ReserveResult> {
		return await this.drizzle.db.transaction(async (tx) => {
			// Lock all reserved/pending/awaiting slots for this event
			const lockedSlots = await tx
				.select({ id: registrationSlot.id })
				.from(registrationSlot)
				.where(
					and(
						eq(registrationSlot.eventId, event.id),
						inArray(registrationSlot.status, [
							RegistrationStatusChoices.PENDING,
							RegistrationStatusChoices.AWAITING_PAYMENT,
							RegistrationStatusChoices.RESERVED,
						]),
					),
				)
				.for("update")

			// Capacity check inside transaction (uses locked row count)
			if (event.registrationMaximum) {
				if (lockedSlots.length + slotCount > event.registrationMaximum) {
					throw new EventFullError()
				}
			}

			// Re-check existing registration inside transaction
			const [existing] = await tx
				.select()
				.from(registration)
				.where(and(eq(registration.userId, userId), eq(registration.eventId, event.id)))

			if (existing) {
				// Check for reserved slots
				const reservedSlots = await tx
					.select()
					.from(registrationSlot)
					.where(
						and(
							eq(registrationSlot.registrationId, existing.id),
							eq(registrationSlot.status, RegistrationStatusChoices.RESERVED),
						),
					)
				if (reservedSlots.length > 0) {
					throw new AlreadyRegisteredError()
				}
			}

			// Create or update registration
			let registrationId: number
			if (existing) {
				registrationId = existing.id
				await tx
					.update(registration)
					.set({ expires: toDbString(expires) })
					.where(eq(registration.id, registrationId))

				// Delete old pending slots
				await tx.delete(registrationSlot).where(eq(registrationSlot.registrationId, registrationId))
			} else {
				const [result] = await tx.insert(registration).values({
					eventId: event.id,
					userId,
					signedUpBy,
					expires: toDbString(expires),
					createdDate: toDbString(new Date()),
				})
				registrationId = Number(result.insertId)
			}

			// Create new slots
			const slotIds: number[] = []
			for (let i = 0; i < slotCount; i++) {
				const [result] = await tx.insert(registrationSlot).values({
					eventId: event.id,
					registrationId,
					status: RegistrationStatusChoices.PENDING,
					startingOrder: i,
					slot: i,
				})
				slotIds.push(Number(result.insertId))
			}

			return { registrationId, slotIds }
		})
	}

	private calculatePaymentTotal(details: PaymentDetail[]): AmountDue {
		const amounts = details.map((d) => d.amount)
		return calculateAmountDue(amounts)
	}
}

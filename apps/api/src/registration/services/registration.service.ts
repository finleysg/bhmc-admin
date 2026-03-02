import {
	BadRequestException,
	ForbiddenException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common"

import {
	ClubEvent,
	DjangoUser,
	RegistrationSlot,
	RegistrationStatusChoices,
	RegistrationWithSlots,
	ReserveRequest,
} from "@repo/domain/types"

import { player, registration, registrationSlot, toDbString, DrizzleService } from "../../database"
import { and, eq, inArray } from "drizzle-orm"
import { EventsService } from "../../events"

import {
	AlreadyRegisteredError,
	CourseRequiredError,
	EventFullError,
	EventRegistrationNotOpenError,
	EventRegistrationWaveError,
	PlayerConflictError,
	SlotConflictError,
	SlotOverflowError,
} from "../errors/registration.errors"
import { isDuplicateEntryError } from "../../database/database-exception.filter"
import { toRegistrationSlot, toRegistrationWithSlots } from "../mappers"
import { RegistrationRepository } from "../repositories/registration.repository"
import { getCurrentWave, getRegistrationWindow, getStartingWave } from "../wave-calculator"
import { PaymentsService } from "./payments.service"
import { RegistrationBroadcastService } from "./registration-broadcast.service"
import { CleanupService } from "./cleanup.service"

// Expiry times in minutes
const CHOOSABLE_EXPIRY_MINUTES = 5
const NON_CHOOSABLE_EXPIRY_MINUTES = 15

@Injectable()
export class RegistrationService {
	private readonly logger = new Logger(RegistrationService.name)

	constructor(
		@Inject(RegistrationRepository) private readonly repository: RegistrationRepository,
		@Inject(PaymentsService) private readonly payments: PaymentsService,
		@Inject(EventsService) private readonly events: EventsService,
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
		@Inject(RegistrationBroadcastService) private readonly broadcast: RegistrationBroadcastService,
		@Inject(CleanupService) private readonly slotCleanup: CleanupService,
	) {}

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
		await this.validateRegistrationRequest(event, request.slotIds, request.courseId ?? null)

		// Calculate expiry
		const expiryMinutes = event.canChoose ? CHOOSABLE_EXPIRY_MINUTES : NON_CHOOSABLE_EXPIRY_MINUTES
		const expires = new Date(Date.now() + expiryMinutes * 60 * 1000)

		let registrationId: number
		if (event.canChoose) {
			registrationId = await this.reserveChoosableSlots(
				user.id,
				user.playerId,
				event,
				request.courseId!,
				request.slotIds,
				signedUpBy,
				expires,
			)
			this.broadcast.notifyChange(event.id)
		} else {
			registrationId = await this.createNonChoosableSlots(
				user.id,
				user.playerId,
				event,
				signedUpBy,
				expires,
			)
		}

		return await this.findRegistrationById(registrationId)
	}

	/**
	 * Get a registration by ID, validating that the user owns it or is in the group.
	 */
	async findRegistrationById(
		registrationId: number,
		playerId?: number,
	): Promise<RegistrationWithSlots> {
		const row = await this.repository.findRegistrationFullById(registrationId)

		// Verify group membership: user's player must be in one of the slots
		if (playerId) {
			const isGroupMember = row.slots.some((s) => s.playerId === playerId)
			if (!isGroupMember) {
				throw new ForbiddenException("Not a member of this group")
			}
		}

		return toRegistrationWithSlots(row)
	}

	/**
	 * Find a registration slot by ID.
	 */
	async findSlotById(slotId: number): Promise<RegistrationSlot> {
		const row = await this.repository.findRegistrationSlotById(slotId)
		return toRegistrationSlot(row)
	}

	/**
	 * Get a registration by gg id. No validation - not a user facing query.
	 */
	async findRegistrationSlotByGgId(ggId: string): Promise<RegistrationSlot | undefined> {
		const row = await this.repository.findRegistrationSlotByGgId(ggId)

		return row ? toRegistrationSlot(row) : undefined
	}

	/**
	 * Update a slot's player assignment.
	 */
	async updateSlotPlayer(slotId: number, playerId: number | null): Promise<RegistrationSlot> {
		try {
			const row = await this.repository.updateRegistrationSlot(slotId, { playerId })
			return toRegistrationSlot(row)
		} catch (error) {
			if (isDuplicateEntryError(error)) {
				throw new PlayerConflictError()
			}
			throw error
		}
	}

	/**
	 * Update registration notes. Only a member of the group can update.
	 */
	async updateNotes(registrationId: number, playerId: number, notes: string | null): Promise<void> {
		const reg = await this.findRegistrationById(registrationId, playerId)
		if (!reg) {
			throw new NotFoundException(`No registration found with id ${registrationId}`)
		}
		await this.repository.updateRegistration(registrationId, { notes })
	}

	/**
	 * Add players to a registration group.
	 * Any group member can add players.
	 */
	async addPlayersToRegistration(
		registrationId: number,
		playerIds: number[],
		playerId: number,
	): Promise<RegistrationWithSlots> {
		const regWithSlots = await this.findRegistrationById(registrationId, playerId)
		const event = await this.events.getEventById(regWithSlots.eventId)

		// Atomic duplicate check + slot assignment with row locks
		await this.drizzle.db.transaction(async (tx) => {
			// Look up player names for error messages
			const players = await tx
				.select({ id: player.id, firstName: player.firstName, lastName: player.lastName })
				.from(player)
				.where(inArray(player.id, playerIds))
			const playerNameMap = new Map(players.map((p) => [p.id, `${p.firstName} ${p.lastName}`]))

			// Check no players are already registered for this event (with row lock)
			for (const pid of playerIds) {
				const existingReg = await this.repository.findRegistrationIdByEventAndPlayer(
					regWithSlots.eventId,
					pid,
					tx,
				)
				if (existingReg) {
					throw new AlreadyRegisteredError(playerNameMap.get(pid) ?? `Player ${pid}`)
				}
			}

			if (event.canChoose) {
				// For canChoose events, find available slots on the same hole/starting_order
				const existingSlot = regWithSlots.slots[0]
				const availableSlots = await tx
					.select()
					.from(registrationSlot)
					.where(
						and(
							eq(registrationSlot.eventId, regWithSlots.eventId),
							eq(registrationSlot.holeId, existingSlot.holeId!),
							eq(registrationSlot.startingOrder, existingSlot.startingOrder),
							eq(registrationSlot.status, RegistrationStatusChoices.AVAILABLE),
						),
					)
					.orderBy(registrationSlot.slot)
					.for("update")

				if (playerIds.length > availableSlots.length) {
					throw new SlotOverflowError(registrationId, playerIds.length)
				}

				// Claim available slots: assign to this registration with player and PENDING status
				for (let i = 0; i < playerIds.length; i++) {
					await tx
						.update(registrationSlot)
						.set({
							playerId: playerIds[i],
							registrationId,
							status: RegistrationStatusChoices.PENDING,
						})
						.where(eq(registrationSlot.id, availableSlots[i].id))
				}
			} else {
				// For non-canChoose events, assign players to existing empty slots
				const emptySlots = regWithSlots.slots
					.filter((s) => s.playerId === undefined)
					.sort((a, b) => a.slot - b.slot)

				if (playerIds.length > emptySlots.length) {
					throw new SlotOverflowError(registrationId, playerIds.length)
				}

				for (let i = 0; i < playerIds.length; i++) {
					await this.repository.updateRegistrationSlot(
						emptySlots[i].id,
						{ playerId: playerIds[i] },
						tx,
					)
				}
			}
		})

		this.broadcast.notifyChange(regWithSlots.eventId)
		return await this.findRegistrationById(registrationId)
	}

	/**
	 * Get available spots for an event.
	 * For canChoose events: counts AVAILABLE slots vs total slots.
	 * For non-canChoose events: registrationMaximum minus RESERVED slots.
	 */
	async getAvailableSpots(
		eventId: number,
	): Promise<{ availableSpots: number; totalSpots: number }> {
		const event = await this.events.getEventById(eventId)

		if (event.canChoose) {
			const availableSpots = await this.repository.countSlotsByEventAndStatus(eventId, [
				RegistrationStatusChoices.AVAILABLE,
			])
			const totalSpots = await this.repository.countSlotsByEvent(eventId)
			return { availableSpots, totalSpots }
		}

		// Non-canChoose: total is registrationMaximum, available is total minus used slots
		const totalSpots = event.registrationMaximum ?? 0
		const usedCount = await this.repository.countSlotsByEventAndStatus(eventId, [
			RegistrationStatusChoices.PENDING,
			RegistrationStatusChoices.AWAITING_PAYMENT,
			RegistrationStatusChoices.RESERVED,
		])
		const availableSpots = Math.max(0, totalSpots - usedCount)
		return { availableSpots, totalSpots }
	}

	/**
	 * Cancel a registration and release slots.
	 */
	async cancelRegistration(
		registrationId: number,
		playerId: number,
		paymentId?: number | null,
	): Promise<void> {
		const reg = await this.findRegistrationById(registrationId, playerId)
		if (!reg) {
			this.logger.warn(`Registration ${registrationId} not found for cancel`)
			return
		}

		if (paymentId) {
			await this.payments.deletePaymentAndFees(paymentId)
		}

		const canChoose = await this.events.isCanChooseHolesEvent(reg.eventId)
		await this.slotCleanup.releaseSlotsByRegistration(registrationId, canChoose)
		await this.repository.deleteRegistration(registrationId)

		if (canChoose) {
			this.broadcast.notifyChange(reg.eventId)
		}
	}

	// =============================================================================
	// Internal helpers
	// =============================================================================

	private async validateRegistrationRequest(
		event: ClubEvent,
		slotIds: number[],
		courseId: number | null,
	): Promise<void> {
		// Ensure we have at least one slot
		if (event.canChoose && slotIds.length === 0) {
			throw new BadRequestException("At least one slot must be requested")
		}

		// Check registration window
		const window = getRegistrationWindow(event)
		if (window === "n/a" || window === "future" || window === "past") {
			throw new EventRegistrationNotOpenError()
		}

		// Validate wave restrictions during priority window
		if (window === "priority" && event.signupWaves) {
			const slot = await this.repository.findRegistrationSlotWithHoleById(slotIds[0])
			const currentWave = getCurrentWave(event)
			const slotWave = getStartingWave(event, slot.startingOrder, slot.hole.holeNumber)
			if (slotWave > currentWave) {
				throw new EventRegistrationWaveError(slotWave)
			}
		}

		// Check course requirement for choosable events
		if (event.canChoose && !courseId) {
			throw new CourseRequiredError()
		}
	}

	private async reserveChoosableSlots(
		userId: number,
		playerId: number,
		event: ClubEvent,
		courseId: number,
		slotIds: number[],
		signedUpBy: string,
		expires: Date,
	): Promise<number> {
		let registrationId = 0

		const existing = await this.repository.findRegistrationByUserAndEvent(userId, event.id)
		if (existing) {
			// Check if already has reserved or in-progress slots
			const reservedSlots = existing.slots.filter(
				(s) =>
					s.status === RegistrationStatusChoices.AWAITING_PAYMENT ||
					s.status === RegistrationStatusChoices.RESERVED,
			)
			if (reservedSlots.length > 0) {
				throw new AlreadyRegisteredError(signedUpBy)
			}

			// Only PENDING slots remain — clean up the stale registration
			this.logger.log(`Cleaning up stale choosable registration ${existing.id} for user ${userId}`)
			await this.cleanupStaleRegistration(existing.id, true)
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

			// Always create a fresh registration
			const [result] = await tx.insert(registration).values({
				eventId: event.id,
				userId,
				courseId,
				signedUpBy,
				expires: toDbString(expires),
				createdDate: toDbString(new Date()),
			})
			registrationId = Number(result.insertId)

			// Assign requesting player to lowest numbered slot
			for (const slot of slots) {
				const pid = slot.id === slotIds[0] ? playerId : null
				await tx
					.update(registrationSlot)
					.set({ playerId: pid, status: RegistrationStatusChoices.PENDING, registrationId })
					.where(eq(registrationSlot.id, slot.id))
			}
		})

		// Should not be possible, but check registrationId was set
		if (registrationId === 0) {
			throw new Error("Failed to create or update registration")
		}

		return registrationId
	}

	private async createNonChoosableSlots(
		userId: number,
		playerId: number,
		event: ClubEvent,
		signedUpBy: string,
		expires: Date,
	): Promise<number> {
		const slotCount = event.maximumSignupGroupSize ?? 1

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
				if (lockedSlots.length + 1 > event.registrationMaximum) {
					throw new EventFullError()
				}
			}

			// Ensure no existing confirmed registration
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
					throw new AlreadyRegisteredError(signedUpBy)
				}

				// Only PENDING slots remain — fully clean up the stale registration
				this.logger.log(
					`Cleaning up stale non-choosable registration ${existing.id} for user ${userId}`,
				)
				await this.cleanupStaleRegistration(existing.id, false)
			}

			const [result] = await tx.insert(registration).values({
				eventId: event.id,
				userId,
				signedUpBy,
				expires: toDbString(expires),
				createdDate: toDbString(new Date()),
			})
			const registrationId = Number(result.insertId)

			// Create new slots
			const slotIds: number[] = []
			for (let i = 0; i < slotCount; i++) {
				const pid = i === 0 ? playerId : null
				const [result] = await tx.insert(registrationSlot).values({
					eventId: event.id,
					playerId: pid,
					registrationId,
					status: RegistrationStatusChoices.PENDING,
					startingOrder: i,
					slot: i,
				})
				slotIds.push(Number(result.insertId))
			}

			return registrationId
		})
	}

	private async cleanupStaleRegistration(
		registrationId: number,
		canChoose: boolean,
	): Promise<void> {
		await this.payments.deletePaymentsForRegistration(registrationId)
		await this.slotCleanup.releaseSlotsByRegistration(registrationId, canChoose)
		await this.repository.deleteRegistration(registrationId)
	}
}

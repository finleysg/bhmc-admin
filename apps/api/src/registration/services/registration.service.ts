import {
	BadRequestException,
	ForbiddenException,
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

import { registration, registrationSlot, toDbString, DrizzleService } from "../../database"
import { and, eq, inArray } from "drizzle-orm"
import { EventsService } from "../../events"

import {
	AlreadyRegisteredError,
	CourseRequiredError,
	EventFullError,
	EventRegistrationNotOpenError,
	EventRegistrationWaveError,
	SlotConflictError,
	SlotOverflowError,
} from "../errors/registration.errors"
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
		private readonly repository: RegistrationRepository,
		private readonly payments: PaymentsService,
		private readonly events: EventsService,
		private readonly drizzle: DrizzleService,
		private readonly broadcast: RegistrationBroadcastService,
		private readonly slotCleanup: CleanupService,
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
	 * Update a slot's player assignment.
	 */
	async updateSlotPlayer(slotId: number, playerId: number | null): Promise<RegistrationSlot> {
		const row = await this.repository.updateRegistrationSlot(slotId, { playerId })
		return toRegistrationSlot(row)
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

		// Get empty slots sorted by slot number
		const emptySlots = regWithSlots.slots
			.filter((s) => s.playerId === undefined)
			.sort((a, b) => a.slot - b.slot)

		if (playerIds.length > emptySlots.length) {
			throw new SlotOverflowError(registrationId, playerIds.length)
		}

		// Atomic duplicate check + slot assignment with row locks
		await this.drizzle.db.transaction(async (tx) => {
			// Check no players are already registered for this event (with row lock)
			for (const pid of playerIds) {
				const existingReg = await this.repository.findRegistrationIdByEventAndPlayer(
					regWithSlots.eventId,
					pid,
					tx,
				)
				if (existingReg) {
					throw new AlreadyRegisteredError(pid, regWithSlots.eventId)
				}
			}

			// Assign players to empty slots
			for (let i = 0; i < playerIds.length; i++) {
				await this.repository.updateRegistrationSlot(
					emptySlots[i].id,
					{ playerId: playerIds[i] },
					tx,
				)
			}
		})

		this.broadcast.notifyChange(regWithSlots.eventId)
		return await this.findRegistrationById(registrationId)
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
			// Check if already has reserved slots
			const reservedSlots = existing.slots.filter(
				(s) =>
					s.status === RegistrationStatusChoices.AWAITING_PAYMENT ||
					s.status === RegistrationStatusChoices.RESERVED,
			)
			if (reservedSlots.length > 0) {
				throw new AlreadyRegisteredError(playerId, event.id)
			}
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

			// Create or update registration
			if (existing) {
				registrationId = existing.id
				await tx
					.update(registration)
					.set({
						courseId,
						expires: toDbString(expires),
					})
					.where(eq(registration.id, registrationId))
			} else {
				const [result] = await tx.insert(registration).values({
					eventId: event.id,
					userId,
					courseId,
					signedUpBy,
					expires: toDbString(expires),
					createdDate: toDbString(new Date()),
				})
				registrationId = Number(result.insertId)
			}

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
					throw new AlreadyRegisteredError(playerId, event.id)
				}
			}

			// We will let the system cleanup process deal with a stale registration
			// and create a new one for this user.
			if (existing) {
				await tx.update(registration).set({ userId: null }).where(eq(registration.id, existing.id))
				await tx
					.update(registrationSlot)
					.set({ playerId: null })
					.where(eq(registrationSlot.registrationId, existing.id))
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
}

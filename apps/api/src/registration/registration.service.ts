import { and, eq, inArray, isNotNull, like, or } from "drizzle-orm"

import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import {
	calculateAmountDue,
	getAmount,
	validateRegisteredPlayer,
	validateRegistration,
} from "@repo/domain/functions"
import {
	AdminRegistration,
	AdminRegistrationSlot,
	AvailableSlotGroup,
	Player,
	PlayerMap,
	PlayerRecord,
	RefundRequest,
	RegisteredPlayer,
	RegistrationSlot,
	RegistrationStatus,
	SearchPlayers,
	ValidatedClubEvent,
	ValidatedRegisteredPlayer,
	ValidatedRegistration,
} from "@repo/domain/types"

import { mapToCourseModel, mapToHoleModel, toCourse, toHole } from "../courses/mappers"
import {
	course,
	DrizzleService,
	eventFee,
	feeType,
	hole,
	payment,
	player,
	refund,
	registration,
	registrationFee,
	registrationSlot,
	toDbString,
} from "../database"
import { EventsService } from "../events"
import { mapToEventFeeModel, mapToFeeTypeModel, toEventFee } from "../events/mappers"
import { StripeService } from "../stripe/stripe.service"
import { RegistrationFeeModel } from "../database/models"
import {
	mapToPlayerModel,
	mapToRegistrationFeeModel,
	mapToRegistrationModel,
	mapToRegistrationSlotModel,
	toPlayer,
	toRegistration,
	toRegistrationFee,
	toRegistrationSlot,
} from "./mappers"
import { RegistrationRepository } from "./registration.repository"

type ActualFeeAmount = {
	eventFeeId: number
	amount: number
}
type AdminRegistrationSlotWithAmount = Omit<AdminRegistrationSlot, "feeIds"> & {
	amounts: ActualFeeAmount[]
}

@Injectable()
export class RegistrationService {
	private readonly logger = new Logger(RegistrationService.name)

	constructor(
		private drizzle: DrizzleService,
		private repository: RegistrationRepository,
		private readonly events: EventsService,
		private readonly stripeService: StripeService,
	) {}

	async getRegisteredPlayers(eventId: number): Promise<ValidatedRegisteredPlayer[]> {
		const rows = await this.drizzle.db
			.select({
				slot: registrationSlot,
				player: player,
				registration: registration,
				course: course,
				hole: hole,
			})
			.from(registrationSlot)
			.leftJoin(registration, eq(registrationSlot.registrationId, registration.id))
			.leftJoin(course, eq(registration.courseId, course.id))
			.leftJoin(player, eq(registrationSlot.playerId, player.id))
			.leftJoin(hole, eq(registrationSlot.holeId, hole.id))
			.where(
				and(
					eq(registrationSlot.eventId, eventId),
					eq(registrationSlot.status, RegistrationStatus.RESERVED),
					isNotNull(registrationSlot.playerId),
				),
			)

		const slotsMap = new Map<number, RegisteredPlayer>()
		const slotIds: number[] = []
		for (const row of rows) {
			this.logger.debug(`Processing slot ${row.slot.id} for player ${row.player?.id}`)
			const sid = row.slot.id
			slotIds.push(sid)
			slotsMap.set(sid, {
				slot: toRegistrationSlot(mapToRegistrationSlotModel(row.slot)),
				player: row.player ? toPlayer(mapToPlayerModel(row.player)) : undefined,
				registration: row.registration
					? toRegistration(mapToRegistrationModel(row.registration))
					: undefined,
				course: row.course ? toCourse(mapToCourseModel(row.course)) : undefined,
				hole: row.hole ? toHole(mapToHoleModel(row.hole)) : undefined,
				fees: [],
			})
		}

		if (slotIds.length === 0) return []

		const feeRows = await this.drizzle.db
			.select({
				fee: registrationFee,
				eventFee: eventFee,
				feeType: feeType,
			})
			.from(registrationFee)
			.leftJoin(eventFee, eq(registrationFee.eventFeeId, eventFee.id))
			.leftJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
			.where(inArray(registrationFee.registrationSlotId, slotIds))

		for (const frow of feeRows) {
			const sid = frow.fee.registrationSlotId
			if (!sid) continue

			const parent = slotsMap.get(sid)
			if (!parent || !parent.fees) continue

			const eventFee = mapToEventFeeModel(frow.eventFee!)
			eventFee.feeType = mapToFeeTypeModel(frow.feeType!)

			const registrationFee = mapToRegistrationFeeModel({
				id: frow.fee.id,
				isPaid: frow.fee.isPaid,
				eventFeeId: frow.fee.eventFeeId,
				paymentId: frow.fee.paymentId,
				registrationSlotId: frow.fee.registrationSlotId!,
				amount: frow.fee.amount,
			})

			const fee = toRegistrationFee(registrationFee)
			fee.eventFee = toEventFee(eventFee)

			parent.fees.push(fee)
		}

		// Requires that all are valid or an error is thrown
		const results = slotIds.map((id) => validateRegisteredPlayer(slotsMap.get(id)!))
		return results
	}

	async searchPlayers(query: SearchPlayers): Promise<Player[]> {
		const { searchText, isMember = true } = query
		let whereClause: any = undefined

		if (searchText) {
			const search = `%${searchText}%`
			const searchCondition = or(
				like(player.firstName, search),
				like(player.lastName, search),
				like(player.ghin, search),
			)
			whereClause = isMember ? and(searchCondition, eq(player.isMember, 1)) : searchCondition
		} else if (isMember) {
			whereClause = eq(player.isMember, 1)
		}

		const results = await this.drizzle.db.select().from(player).where(whereClause)
		return results.map(mapToPlayerModel).map(toPlayer)
	}

	async findGroup(eventId: number, playerId: number): Promise<ValidatedRegistration> {
		// Step 1: Find the registration ID via player's slot
		const registrationId = await this.repository.findRegistrationIdByEventAndPlayer(
			eventId,
			playerId,
		)

		if (!registrationId) {
			throw new NotFoundException(`Player ${playerId} is not registered for event ${eventId}`)
		}

		// Step 2: Get registration with course (already mapped to model)
		const registrationModel = await this.repository.findRegistrationWithCourse(registrationId)

		if (!registrationModel) {
			throw new NotFoundException(`Registration ${registrationId} not found`)
		}

		// Transform to domain and set course if present
		const result = toRegistration(registrationModel)
		if (registrationModel.course) {
			result.course = toCourse(registrationModel.course)
		}

		// Step 3: Get all slots with player and hole data (already mapped to models)
		const slotModels = await this.repository.findSlotsWithPlayerAndHole(registrationId)

		// Transform models to domain objects
		const slots = slotModels.map((slotModel) => {
			const slot = toRegistrationSlot(slotModel)
			if (slotModel.player) {
				slot.player = toPlayer(slotModel.player)
			}
			if (slotModel.hole) {
				slot.hole = toHole(slotModel.hole)
			}
			slot.fees = []
			return slot
		})

		// Step 4: Get fees and attach to slots (already mapped to models)
		const slotIds = slots
			.filter((s): s is RegistrationSlot & { id: number } => s.id !== undefined)
			.map((s) => s.id)
		const feeModels = await this.repository.findFeesWithEventFeeAndFeeType(slotIds)

		// Create slot map for efficient lookup
		const slotMap = new Map<number, RegistrationSlot>()
		for (const slot of slots) {
			if (slot.id) {
				slotMap.set(slot.id, slot)
			}
		}

		// Attach fees to their slots
		for (const feeModel of feeModels) {
			const slotId = feeModel.registrationSlotId
			if (!slotId) continue

			const slot = slotMap.get(slotId)
			if (!slot) continue

			const fee = toRegistrationFee(feeModel)
			if (feeModel.eventFee) {
				fee.eventFee = toEventFee(feeModel.eventFee)
			}

			slot.fees!.push(fee)
		}

		// Step 5: Attach slots to registration and return
		result.slots = slots

		try {
			const validatedResult = validateRegistration(result)
			return validatedResult
		} catch (error) {
			this.logger.warn(`Validation failed for registration ${registrationId}: ${String(error)}`)
			throw new BadRequestException("The registration is not valid")
		}
	}

	/**
	 * Find all ValidatedRegistrations for an event where any related player's first or last name matches searchText.
	 */
	async findGroups(eventId: number, searchText: string): Promise<ValidatedRegistration[]> {
		this.logger.log(`Searching groups for event ${eventId} with text "${searchText}"`)

		const registrationIds = await this.repository.findRegistrationIdsByEventAndPlayerName(
			eventId,
			searchText,
		)
		this.logger.log(`Found ${registrationIds.length} matching registration IDs`)

		const results: ValidatedRegistration[] = []
		for (const registrationId of registrationIds) {
			const registrationModel = await this.repository.findRegistrationWithCourse(registrationId)
			if (!registrationModel) continue

			const result = toRegistration(registrationModel)
			if (registrationModel.course) {
				result.course = toCourse(registrationModel.course)
			}

			const slotModels = await this.repository.findSlotsWithPlayerAndHole(registrationId)
			const slots = slotModels.map((slotModel) => {
				const slot = toRegistrationSlot(slotModel)
				if (slotModel.player) {
					slot.player = toPlayer(slotModel.player)
				}
				if (slotModel.hole) {
					slot.hole = toHole(slotModel.hole)
				}
				slot.fees = []
				return slot
			})

			const slotIds = slots
				.filter((s): s is RegistrationSlot & { id: number } => s.id !== undefined)
				.map((s) => s.id)
			const feeModels = await this.repository.findFeesWithEventFeeAndFeeType(slotIds)

			const slotMap = new Map<number, RegistrationSlot>()
			for (const slot of slots) {
				if (slot.id) {
					slotMap.set(slot.id, slot)
				}
			}

			for (const feeModel of feeModels) {
				const slotId = feeModel.registrationSlotId
				if (!slotId) continue

				const slot = slotMap.get(slotId)
				if (!slot) continue

				const fee = toRegistrationFee(feeModel)
				if (feeModel.eventFee) {
					fee.eventFee = toEventFee(feeModel.eventFee)
				}

				slot.fees!.push(fee)
			}

			result.slots = slots

			try {
				const validatedResult = validateRegistration(result)
				results.push(validatedResult)
			} catch (error) {
				this.logger.warn(
					`Skipping registration ${registrationId} due to validation error: ${String(error)}`,
				)
			}
		}
		return results
	}

	async updatePlayerGgId(playerId: number, ggId: string): Promise<Player> {
		const player = await this.repository.findPlayerById(playerId)
		player.ggId = ggId
		const updated = await this.repository.updatePlayer(playerId, player)
		return toPlayer(updated)
	}

	/**
	 * Update the ggId on a registration slot.
	 * Returns the updated slot or null if not found.
	 */
	async updateRegistrationSlotGgId(slotId: number, ggId: string): Promise<RegistrationSlot> {
		const slot = await this.repository.findRegistrationSlotById(slotId)
		slot.ggId = ggId
		const updated = await this.repository.updateRegistrationSlot(slotId, slot)
		return toRegistrationSlot(updated)
	}

	/**
	 * Get a map of Golf Genius member IDs to player records for an event.
	 * Used for efficient player lookups during Golf Genius integration operations.
	 */
	async getPlayerMapForEvent(eventId: number): Promise<PlayerMap> {
		const playerRecords = await this.drizzle.db
			.select({
				ggId: registrationSlot.ggId,
				id: player.id,
				firstName: player.firstName,
				lastName: player.lastName,
				email: player.email,
			})
			.from(registrationSlot)
			.innerJoin(player, eq(registrationSlot.playerId, player.id))
			.where(eq(registrationSlot.eventId, eventId))

		const playerMap = new Map<string, PlayerRecord>()
		for (const record of playerRecords) {
			if (record.ggId) {
				// Only include records with valid ggId
				playerMap.set(record.ggId, {
					id: record.id,
					firstName: record.firstName,
					lastName: record.lastName,
					email: record.email,
				})
			}
		}
		return playerMap
	}

	async completeAdminRegistration(
		eventId: number,
		registrationId: number,
		dto: AdminRegistration,
	): Promise<number> {
		// This will be returned so we can make a payment request
		let paymentId: number = -1

		// Fetch existing registration to validate
		const [existingRegistration] = await this.drizzle.db
			.select()
			.from(registration)
			.where(and(eq(registration.id, registrationId), eq(registration.eventId, eventId)))
			.limit(1)

		if (!existingRegistration) {
			throw new NotFoundException(`Registration ${registrationId} not found`)
		}

		// Get event record for fee calculations
		const eventRecord = await this.events.getValidatedClubEventById(eventId, false)
		if (!eventRecord) {
			throw new BadRequestException("event id not found")
		}

		const convertedSlots = await this.convertSlots(eventRecord, dto.slots)
		const allAmounts = convertedSlots.flatMap((slot) => slot.amounts.map((a) => a.amount))
		const totalAmountDue = calculateAmountDue(allAmounts)

		// Calculate expiry datetime
		const expires = new Date()
		expires.setHours(expires.getHours() + dto.expires)

		// Use transaction
		await this.drizzle.db.transaction(async (tx) => {
			// Update registration
			await tx
				.update(registration)
				.set({
					userId: dto.userId,
					signedUpBy: dto.signedUpBy,
					notes: dto.notes,
					courseId: dto.courseId,
					startingHole: 1, // legacy field, always 1
					startingOrder: 0, // legacy field, always 0
					expires: toDbString(expires),
				})
				.where(eq(registration.id, registrationId))

			// Create payment
			const paymentCode = dto.collectPayment ? "Requested" : "Waived"
			const [paymentResult] = await tx.insert(payment).values({
				paymentCode,
				eventId,
				userId: dto.userId,
				paymentAmount: totalAmountDue.total.toFixed(2),
				transactionFee: totalAmountDue.transactionFee.toFixed(2),
				confirmed: 0,
				notificationType: "A",
			})
			paymentId = Number(paymentResult.insertId)

			// Update slots and insert related fees
			for (const slot of convertedSlots) {
				await tx
					.update(registrationSlot)
					.set({
						status: RegistrationStatus.AWAITING_PAYMENT,
						playerId: slot.playerId,
						holeId: dto.startingHoleId,
						startingOrder: dto.startingOrder,
					})
					.where(eq(registrationSlot.id, slot.slotId))

				for (const fee of slot.amounts) {
					await tx.insert(registrationFee).values({
						isPaid: 0,
						eventFeeId: fee.eventFeeId,
						paymentId,
						registrationSlotId: slot.slotId,
						amount: fee.amount.toFixed(2),
					})
				}
			}
		})

		return paymentId
	}

	/**
	 * Convert slots to AdminRegistrationSlotWithAmount, which has
	 * the amount calculated for each player (Senior discounts, for example)
	 * @param eventRecord - A valid club event
	 * @param slot - Player and their selected fees
	 * @returns
	 */
	async convertSlots(
		eventRecord: ValidatedClubEvent,
		slots: AdminRegistrationSlot[],
	): Promise<AdminRegistrationSlotWithAmount[]> {
		const startDate = new Date(eventRecord.startDate)
		const convertedSlots: AdminRegistrationSlotWithAmount[] = []

		// Collect all playerIds from slots
		const playerIds = Array.from(new Set(slots.map((slot) => slot.playerId)))

		// Batch fetch all players
		const players = await this.repository.findPlayersByIds(playerIds)
		// Only include players with valid id
		const playerLookup = new Map<number, Player>(players.map((p) => [p.id as number, toPlayer(p)]))

		for (const slot of slots) {
			const convertedSlot: AdminRegistrationSlotWithAmount = {
				...slot,
				amounts: [],
			}
			const player = playerLookup.get(slot.playerId)
			const eventFees = eventRecord.eventFees.filter((ef) => slot.feeIds.includes(ef.id))
			convertedSlot.amounts = eventFees.map((ef) => {
				const playerAmount = getAmount(ef, player ?? ({} as Player), startDate)
				return { eventFeeId: ef.id, amount: playerAmount }
			})
			convertedSlots.push(convertedSlot)
		}
		return convertedSlots
	}

	/**
	 * Get available slot groups for an event and course.
	 * Returns groups of slots with the same holeId and startingOrder that have enough available slots for the requested number of players.
	 */
	async getAvailableSlots(
		eventId: number,
		courseId: number,
		players: number,
	): Promise<AvailableSlotGroup[]> {
		const slotModels = await this.repository.findAvailableSlots(eventId, courseId)

		// Group slots by holeId and startingOrder
		const groups = new Map<string, RegistrationSlot[]>()
		for (const slotModel of slotModels) {
			const key = `${slotModel.holeId}-${slotModel.startingOrder}`
			if (!groups.has(key)) {
				groups.set(key, [])
			}
			groups.get(key)!.push(toRegistrationSlot(slotModel))
		}

		// Filter groups that have enough available slots and transform to AvailableSlotGroup
		const result: AvailableSlotGroup[] = []
		for (const [key, slots] of groups) {
			if (slots.length >= players) {
				const [holeId, startingOrder] = key.split("-").map(Number)
				result.push({
					holeId,
					startingOrder,
					slots,
				})
			}
		}

		return result
	}

	async reserveSlots(eventId: number, slotIds: number[]): Promise<number> {
		// Use transaction to atomically validate and reserve slots
		return await this.drizzle.db.transaction(async (tx) => {
			// Create empty registration record first
			const [registrationResult] = await tx.insert(registration).values({
				eventId,
				startingHole: 1,
				startingOrder: 0,
				createdDate: toDbString(new Date()),
			})
			const registrationId = Number(registrationResult.insertId)

			// Atomically update slots: only reserve slots that are available ('A') and belong to the event
			// This prevents TOCTOU race conditions by checking and updating in a single atomic operation
			const updateResult = await tx
				.update(registrationSlot)
				.set({
					registrationId,
					status: RegistrationStatus.PENDING,
				})
				.where(
					and(
						inArray(registrationSlot.id, slotIds),
						eq(registrationSlot.eventId, eventId),
						eq(registrationSlot.status, RegistrationStatus.AVAILABLE),
					),
				)

			const updateResultAny = updateResult as any
			this.logger.debug("Update result: " + JSON.stringify(updateResultAny))

			// Validate that all requested slots were successfully reserved
			// If the affected row count doesn't match slotIds.length, some slots were not available
			// Drizzle MySQL2 update returns [ResultSetHeader, FieldPacket[]]; access affectedRows from the header
			if (
				(updateResult as [{ affectedRows: number }, unknown])[0].affectedRows !== slotIds.length
			) {
				throw new BadRequestException("Not all requested slots are available!")
			}

			return registrationId
		})
	}

	/**
	 * Drop players from a registration by releasing or deleting their slots.
	 * Updates registration notes to record the dropped players.
	 * @param registrationId - The registration ID
	 * @param slotIds - Array of slot IDs to drop
	 * @returns Number of players dropped
	 */
	async dropPlayers(registrationId: number, slotIds: number[]): Promise<number> {
		// Validate payload
		if (!slotIds.length) {
			throw new BadRequestException("At least one slot ID is required")
		}

		const allPlayerSlots = await this.repository.findSlotsWithPlayerAndHole(registrationId)
		const playerSlots = allPlayerSlots.filter((s) => slotIds.includes(s.id))

		if (playerSlots.length !== slotIds.length) {
			throw new BadRequestException(
				`Not all slots provided belong to registration ${registrationId}`,
			)
		}
		if (playerSlots.some((slotRow) => !slotRow.player)) {
			throw new BadRequestException("Not all slots provided have a player assigned")
		}
		if (playerSlots.some((slotRow) => slotRow.status !== RegistrationStatus.RESERVED)) {
			throw new BadRequestException(
				`Not all slots provided have status ${RegistrationStatus.RESERVED}`,
			)
		}

		// Fetch registration
		const registrationModel = await this.repository.findRegistrationById(registrationId)
		if (!registrationModel) {
			throw new NotFoundException(`Registration ${registrationId} not found`)
		}

		// Fetch event
		const eventRecord = await this.events.getValidatedClubEventById(
			registrationModel.eventId,
			false,
		)

		// Prepare notes
		const droppedPlayerNames = playerSlots.map((row) => {
			const p = row.player
			return p ? `${p.firstName} ${p.lastName}`.trim() : "Unknown Player"
		})
		const currentNotes = registrationModel.notes || ""
		const dropDate = new Date().toISOString().split("T")[0] // YYYY-MM-DD
		const newNotes =
			`${currentNotes}\nDropped ${droppedPlayerNames.join(", ")} on ${dropDate}`.trim()

		// Execute transaction
		await this.drizzle.db.transaction(async (tx) => {
			// Update registration notes
			await tx
				.update(registration)
				.set({ notes: newNotes })
				.where(eq(registration.id, registrationId))

			// Update fees to nullify slot references
			await tx
				.update(registrationFee)
				.set({ registrationSlotId: null })
				.where(inArray(registrationFee.registrationSlotId, slotIds))

			// Handle slots based on event.canChoose
			if (eventRecord.canChoose) {
				// Reset slots to available
				await tx
					.update(registrationSlot)
					.set({
						registrationId: null,
						playerId: null,
						status: RegistrationStatus.AVAILABLE,
					})
					.where(inArray(registrationSlot.id, slotIds))
			} else {
				// Delete slots
				await tx.delete(registrationSlot).where(inArray(registrationSlot.id, slotIds))
			}
		})

		return slotIds.length
	}

	/**
	 * Process refunds for the given event.
	 * For each RefundRequest, retrieves payment intent, calculates refund amount,
	 * creates a pending refund record in a transaction, then requests refund from Stripe.
	 * Uses a two-phase approach: DB transaction first (with pending state), then Stripe call.
	 * @param issuerId - The ID of the user issuing the refund
	 * @param requests - Array of refund requests
	 */
	async processRefunds(requests: RefundRequest[], issuerId: number): Promise<void> {
		if (!requests.length) {
			throw new BadRequestException("At least one refund request is required")
		}

		for (const request of requests) {
			// Retrieve payment with associated fees
			const paymentRecord = await this.repository.findPaymentWithDetailsById(request.paymentId)
			if (!paymentRecord || !paymentRecord.paymentCode || !paymentRecord.paymentDetails) {
				throw new NotFoundException(`Payment ${request.paymentId} is not valid for refund`)
			}

			// Calculate total refund amount
			const refundAmount = paymentRecord.paymentDetails.reduce(
				(total: number, fee: RegistrationFeeModel) => {
					const amount = fee.isPaid ? Math.round(fee.amount * 100) : 0
					return total + amount
				},
				0,
			)

			if (refundAmount <= 0) {
				throw new BadRequestException("Refund amount must be greater than zero")
			}

			const refundInDollars = refundAmount / 100

			// Phase 1: Create pending refund record and update fees in a transaction
			// This ensures DB consistency - both operations succeed or both fail
			let refundId: number
			try {
				refundId = await this.drizzle.db.transaction(async (tx) => {
					// Create a refund record with "pending" status (no refundCode yet)
					const refundRecord = {
						refundCode: "pending",
						refundAmount: refundInDollars.toFixed(2),
						confirmed: 0,
						refundDate: toDbString(new Date()),
						issuerId,
						paymentId: request.paymentId,
					}
					const [result] = await tx.insert(refund).values(refundRecord)
					const newRefundId = Number(result.insertId)

					// Update the registration fees to unpaid within the same transaction
					if (request.registrationFeeIds.length > 0) {
						await tx
							.update(registrationFee)
							.set({ isPaid: 0 })
							.where(inArray(registrationFee.id, request.registrationFeeIds))
					}

					return newRefundId
				})
			} catch (dbError) {
				this.logger.error(
					`Failed to create pending refund record for payment ${request.paymentId}`,
					dbError,
				)
				throw dbError
			}

			// Phase 2: Request the refund from Stripe
			// If this fails, the DB record remains in "pending" state for manual review/retry
			try {
				const stripeRefundId = await this.stripeService.createRefund(
					paymentRecord.paymentCode,
					refundInDollars,
				)

				// Update the refund record with the Stripe refund ID
				await this.repository.updateRefundCode(refundId, stripeRefundId)
			} catch (stripeError) {
				this.logger.error(
					`Stripe refund failed for payment ${request.paymentId}. ` +
						`Refund record ${refundId} remains in pending state for manual review.`,
					stripeError,
				)
				// Re-throw to indicate failure - the pending record allows for retry/investigation
				throw stripeError
			}
		}
	}
}

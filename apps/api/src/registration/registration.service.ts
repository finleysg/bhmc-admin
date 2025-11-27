import { and, eq, inArray, isNotNull, like, or } from "drizzle-orm"

import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import {
	calculateTransactionFee,
	validateRegisteredPlayer,
	validateRegistration,
} from "@repo/domain/functions"
import {
	AdminRegistration,
	AvailableSlotGroup,
	Player,
	PlayerMap,
	PlayerRecord,
	RegisteredPlayer,
	RegistrationSlot,
	SearchPlayers,
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
	registration,
	registrationFee,
	registrationSlot,
} from "../database"
import { EventsService } from "../events"
import { mapToEventFeeModel, mapToFeeTypeModel, toEventFee } from "../events/mappers"
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

@Injectable()
export class RegistrationService {
	private readonly logger = new Logger(RegistrationService.name)

	constructor(
		private drizzle: DrizzleService,
		private repository: RegistrationRepository,
		private readonly events: EventsService,
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
					eq(registrationSlot.status, "R"),
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

		const validatedResult = validateRegistration(result)
		if (!validatedResult) {
			throw new BadRequestException("The registration is not valid")
		}

		return validatedResult
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
	): Promise<void> {
		// Fetch existing registration to validate
		const [existingRegistration] = await this.drizzle.db
			.select()
			.from(registration)
			.where(eq(registration.id, registrationId))
			.limit(1)

		if (!existingRegistration) {
			throw new NotFoundException(`Registration ${registrationId} not found`)
		}

		if (existingRegistration.eventId !== eventId) {
			throw new BadRequestException(
				`Registration ${registrationId} does not belong to event ${eventId}`,
			)
		}

		// Get event record for fee validation
		const eventRecord = await this.events.getValidatedClubEventById(eventId)
		if (!eventRecord) {
			throw new BadRequestException("event id not found")
		}

		// Calculate payment amount from fees
		const allFees = dto.slots.flatMap((slot) => slot.fees)
		let totalAmount = "0.00"
		for (const fee of allFees) {
			totalAmount = (parseFloat(totalAmount) + fee.amount).toFixed(2)
		}

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
					expires: expires.toISOString().slice(0, 19).replace("T", " "),
				})
				.where(eq(registration.id, registrationId))

			// Create payment
			const paymentCode = dto.collectPayment ? "Requested" : "Waived"
			let transactionFee = "0.00"
			if (dto.collectPayment) {
				const fee = calculateTransactionFee(parseFloat(totalAmount))
				transactionFee = fee.toFixed(2)
			}
			const [paymentResult] = await tx.insert(payment).values({
				paymentCode,
				eventId,
				userId: dto.userId,
				paymentAmount: totalAmount,
				transactionFee,
				confirmed: 0,
				notificationType: "A",
			})
			const paymentId = Number(paymentResult.insertId)

			// Update slots
			for (const slot of dto.slots) {
				await tx
					.update(registrationSlot)
					.set({
						status: "X",
						playerId: slot.playerId,
						holeId: dto.startingHoleId,
						startingOrder: dto.startingOrder,
					})
					.where(eq(registrationSlot.id, slot.slotId))
			}

			// Create registration fees
			for (const slot of dto.slots) {
				for (const eventFee of slot.fees) {
					await tx.insert(registrationFee).values({
						isPaid: 0,
						eventFeeId: eventFee.id!,
						paymentId,
						registrationSlotId: slot.slotId,
						amount: eventFee.amount.toFixed(2),
					})
				}
			}
		})
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
				createdDate: new Date().toISOString().slice(0, 19).replace("T", " "),
			})
			const registrationId = Number(registrationResult.insertId)

			// Atomically update slots: only reserve slots that are available ('A') and belong to the event
			// This prevents TOCTOU race conditions by checking and updating in a single atomic operation
			const updateResult = await tx
				.update(registrationSlot)
				.set({
					registrationId,
					status: "P",
				})
				.where(
					and(
						inArray(registrationSlot.id, slotIds),
						eq(registrationSlot.eventId, eventId),
						eq(registrationSlot.status, "A"),
					),
				)

			// Validate that all requested slots were successfully reserved
			// If the affected row count doesn't match slotIds.length, some slots were not available
			if ((updateResult as any).affectedRows !== slotIds.length) {
				throw new BadRequestException("Not all requested slots are available!")
			}

			return registrationId
		})
	}
}

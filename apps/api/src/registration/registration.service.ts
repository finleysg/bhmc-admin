import { and, eq, inArray, isNotNull, like, or } from "drizzle-orm"

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { validateRegisteredPlayer, validateRegistration } from "@repo/domain/functions"
import {
	AddAdminRegistration,
	Player,
	PlayerMap,
	PlayerRecord,
	RegisteredPlayer,
	RegistrationSlot,
	SearchPlayers,
	ValidatedRegisteredPlayer,
	ValidatedRegistration,
} from "@repo/domain/types"

import { mapToCourseModel, toCourse, toHole } from "../courses/mappers"
import {
	course,
	DrizzleService,
	eventFee,
	feeType,
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
			})
			.from(registrationSlot)
			.leftJoin(registration, eq(registrationSlot.registrationId, registration.id))
			.leftJoin(course, eq(registration.courseId, course.id))
			.leftJoin(player, eq(registrationSlot.playerId, player.id))
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
			const sid = row.slot.id
			slotIds.push(sid)
			slotsMap.set(sid, {
				slot: toRegistrationSlot(mapToRegistrationSlotModel(row.slot)),
				player: row.player ? toPlayer(mapToPlayerModel(row.player)) : undefined,
				registration: row.registration
					? toRegistration(mapToRegistrationModel(row.registration))
					: undefined,
				course: row.course ? toCourse(mapToCourseModel(row.course)) : undefined,
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

		// Require that all are valid
		const results = slotIds.map((id) => validateRegisteredPlayer(slotsMap.get(id)!))
		if (!results || results.length === 0 || results.some((r) => r == null)) {
			throw new BadRequestException("Not all registered players are valid.")
		}

		return results.filter((r) => r != null)
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

	async createAdminRegistration(eventId: number, dto: AddAdminRegistration): Promise<number> {
		const eventRecord = await this.events.getValidatedClubEventById(eventId)

		if (!eventRecord) {
			throw new BadRequestException("event id not found")
		}

		if (!dto.requestPayment && !dto.paymentCode) {
			throw new BadRequestException("paymentCode is required when requestPayment is false")
		}

		const slotIds = new Set<number>()
		if (eventRecord.canChoose) {
			for (const slot of dto.slots) {
				if (!slot.slotId) {
					throw new BadRequestException("slotId is required for canChoose events")
				}
				if (slotIds.has(slot.slotId)) {
					throw new BadRequestException("Duplicate slotId in slots")
				}
				slotIds.add(slot.slotId)

				// Fetch and validate slot
				const [existingSlot] = await this.drizzle.db
					.select()
					.from(registrationSlot)
					.where(eq(registrationSlot.id, slot.slotId))
					.limit(1)
				if (!existingSlot) {
					throw new NotFoundException(`Slot ${slot.slotId} not found`)
				}
				if (existingSlot.eventId !== eventId) {
					throw new BadRequestException(`Slot ${slot.slotId} does not belong to event ${eventId}`)
				}
				if (existingSlot.status !== "A") {
					throw new BadRequestException(
						`Slot ${slot.slotId} is not available (status: ${existingSlot.status})`,
					)
				}
				if (existingSlot.playerId !== null) {
					throw new BadRequestException(`Slot ${slot.slotId} is already taken`)
				}
			}
		}

		// Derive courseId for canChoose using preloaded data
		let courseId: number | null = null
		if (eventRecord.canChoose && dto.slots.length > 0) {
			const firstSlotId = dto.slots[0].slotId!
			const firstSlot = await this.repository.findRegistrationSlotById(firstSlotId)

			// Find courseId from the first slot
			const holeData = eventRecord
				.courses!.flatMap((c) => c.holes)
				.find((h) => h.id === firstSlot.holeId)
			if (!holeData) {
				throw new BadRequestException(
					`Hole ${firstSlot.holeId} is not part of event ${eventId} course configuration`,
				)
			}
			courseId = holeData.courseId
		}

		// Calculate payment amount using preloaded eventFees
		const allEventFeeIds = dto.slots.flatMap((s: { eventFeeIds: number[] }) => s.eventFeeIds)
		const uniqueEventFeeIds = [...new Set(allEventFeeIds)]
		let totalAmount = "0.00"
		for (const feeId of uniqueEventFeeIds) {
			const fee = eventRecord.eventFees.find((f) => f.id === feeId)
			if (fee) {
				const amount = fee.amount
				totalAmount = (parseFloat(totalAmount) + amount).toFixed(2)
			}
		}

		// Use transaction
		return await this.drizzle.db.transaction(async (tx) => {
			// Create registration
			const [registrationResult] = await tx.insert(registration).values({
				eventId,
				courseId,
				signedUpBy: dto.signedUpBy,
				userId: dto.userId,
				notes: dto.notes,
				startingHole: 1,
				startingOrder: 0,
				createdDate: new Date().toISOString().slice(0, 19).replace("T", " "),
			})
			const registrationId = Number(registrationResult.insertId)

			// Create payment
			const paymentCode = dto.requestPayment ? "requested" : dto.paymentCode!
			const [paymentResult] = await tx.insert(payment).values({
				paymentCode,
				eventId,
				userId: dto.userId,
				paymentAmount: totalAmount,
				transactionFee: "0.00",
				confirmed: 0,
				notificationType: "A",
			})
			const paymentId = Number(paymentResult.insertId)

			// Handle slots
			const slotIdMap = new Map<number, number>() // slotId -> new/updated slotId
			const status = dto.requestPayment ? "X" : "R"

			if (eventRecord.canChoose) {
				for (const slot of dto.slots) {
					await tx
						.update(registrationSlot)
						.set({
							status,
							playerId: slot.playerId,
							registrationId,
						})
						.where(eq(registrationSlot.id, slot.slotId!))
					slotIdMap.set(slot.slotId!, slot.slotId!)
				}
			} else {
				for (let i = 0; i < dto.slots.length; i++) {
					const slot = dto.slots[i]
					const [slotResult] = await tx.insert(registrationSlot).values({
						eventId,
						playerId: slot.playerId,
						registrationId,
						status,
						startingOrder: 0,
						slot: 0,
					})
					slotIdMap.set(i, Number(slotResult.insertId)) // Use index as key for non-canChoose
				}
			}

			// Create registration fees
			for (const slot of dto.slots) {
				const slotId = eventRecord.canChoose
					? slot.slotId!
					: slotIdMap.get(dto.slots.indexOf(slot))!
				for (const eventFeeId of slot.eventFeeIds) {
					const [feeRecord] = await tx
						.select({ amount: eventFee.amount })
						.from(eventFee)
						.where(eq(eventFee.id, eventFeeId))
						.limit(1)
					if (!feeRecord) continue

					await tx.insert(registrationFee).values({
						isPaid: 0,
						eventFeeId,
						paymentId,
						registrationSlotId: slotId,
						amount: feeRecord.amount,
					})
				}
			}

			// Return the registration ID
			return registrationId
		})
	}
}

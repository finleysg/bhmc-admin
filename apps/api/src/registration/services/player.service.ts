import { and, eq, inArray, isNotNull } from "drizzle-orm"

import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { dummyCourse, dummyHole, getAmount, validateRegistration } from "@repo/domain/functions"
import {
	AvailableSlotGroup,
	Player,
	PlayerMap,
	PlayerRecord,
	RegistrationSlot,
	RegistrationStatusChoices,
	PlayerQuery,
	RegisteredPlayer,
	CompleteRegistration,
	CompleteRegistrationFee,
	EventTypeChoices,
	ReplacePlayerRequest,
	ReplacePlayerResponse,
} from "@repo/domain/types"

import { toCourse, toHole } from "../../courses/mappers"
import {
	course,
	DrizzleService,
	eventFee,
	feeType,
	hole,
	player,
	registration,
	registrationFee,
	registrationSlot,
	toDbString,
} from "../../database"
import { EventsService } from "../../events"
import {
	attachFeesToSlots,
	hydrateSlotsWithPlayerAndHole,
	toPlayer,
	toRegistration,
	toRegistrationFeeWithEventFee,
	toRegistrationSlot,
} from "../mappers"
import { RegistrationRepository } from "../repositories/registration.repository"
import { PaymentsRepository } from "../repositories/payments.repository"
import { RegistrationBroadcastService } from "./registration-broadcast.service"

@Injectable()
export class PlayerService {
	private readonly logger = new Logger(PlayerService.name)

	constructor(
		@Inject(DrizzleService) private drizzle: DrizzleService,
		@Inject(RegistrationRepository) private repository: RegistrationRepository,
		@Inject(PaymentsRepository) private readonly paymentsRepository: PaymentsRepository,
		@Inject(EventsService) private readonly events: EventsService,
		@Inject(RegistrationBroadcastService) private readonly broadcast: RegistrationBroadcastService,
	) {}

	/** Find a player by id */
	async findPlayerById(playerId: number): Promise<Player> {
		try {
			const player = await this.repository.findPlayerById(playerId)
			return toPlayer(player)
		} catch {
			throw new NotFoundException(`Player ${playerId} not found`)
		}
	}

	/** Find a player by id */
	async findPlayerByGhin(ghin: string): Promise<Player | undefined> {
		const player = await this.repository.findPlayerByGhin(ghin)
		return player ? toPlayer(player) : undefined
	}

	/** Get registered players with fees for an event. */
	async getRegisteredPlayers(eventId: number): Promise<RegisteredPlayer[]> {
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
					eq(registrationSlot.status, RegistrationStatusChoices.RESERVED),
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
				slot: toRegistrationSlot(row.slot),
				player: toPlayer(row.player!),
				registration: toRegistration(row.registration!),
				course: row.course ? toCourse(row.course) : dummyCourse(),
				hole: row.hole ? toHole(row.hole) : dummyHole(),
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

			if (!frow.eventFee || !frow.feeType) continue

			const fee = toRegistrationFeeWithEventFee({
				fee: frow.fee,
				eventFee: frow.eventFee,
				feeType: frow.feeType,
			})

			parent.fees.push(fee as CompleteRegistrationFee)
		}

		const results = slotIds.map((id) => slotsMap.get(id)!)
		return results
	}

	/** Return all members */
	async getMembers(): Promise<Player[]> {
		const members = await this.repository.findMemberPlayers()
		return members.map((player) => toPlayer(player))
	}

	/** Search players by name/GHIN with membership filter. */
	async searchPlayers(query: PlayerQuery): Promise<Player[]> {
		let players: Player[] = []
		const { searchText, isMember = true, eventId, excludeRegistered = true } = query

		if (searchText) {
			const results = await this.repository.findPlayersByText(searchText)
			results.forEach((r) => players.push(toPlayer(r)))
		} else {
			const results = await this.repository.getPlayers()
			results.forEach((r) => players.push(toPlayer(r)))
		}

		if (isMember) {
			players = players.filter((p) => p.isMember)
		}

		if (excludeRegistered && eventId) {
			const registered = await this.repository.findRegisteredPlayers(eventId)
			const registeredIds = new Set(registered.map((r) => r.id))
			return players.filter((p) => !registeredIds.has(p.id))
		}

		return players
	}

	/** Find registration group by event and player. */
	async findGroup(eventId: number, playerId: number): Promise<CompleteRegistration> {
		const registrationId = await this.repository.findRegistrationIdByEventAndPlayer(
			eventId,
			playerId,
		)

		if (!registrationId) {
			throw new NotFoundException(`Player ${playerId} is not registered for event ${eventId}`)
		}

		const regWithCourse = await this.repository.findRegistrationWithCourse(registrationId)

		if (!regWithCourse) {
			throw new NotFoundException(`Registration ${registrationId} not found`)
		}

		const result = toRegistration(regWithCourse.registration)
		if (regWithCourse.course) {
			result.course = toCourse(regWithCourse.course)
		}

		const slotRows = await this.repository.findSlotsWithPlayerAndHole(registrationId)
		const slots = hydrateSlotsWithPlayerAndHole(slotRows)

		const slotIds = slots
			.filter((s): s is RegistrationSlot & { id: number } => s.id !== undefined)
			.map((s) => s.id)
		const feeRows = await this.repository.findFeesWithEventFeeAndFeeType(slotIds)

		attachFeesToSlots(slots, feeRows)

		result.slots = slots

		try {
			const validatedResult = validateRegistration(result)
			return validatedResult
		} catch (error) {
			this.logger.warn(`Validation failed for registration ${registrationId}: ${String(error)}`)
			throw new BadRequestException("The registration is not valid")
		}
	}

	/** Search registration groups by player name. */
	async findGroups(eventId: number, searchText: string): Promise<CompleteRegistration[]> {
		this.logger.log(`Searching groups for event ${eventId} with text "${searchText}"`)

		const registrationIds = await this.repository.findRegistrationIdsByEventAndPlayerName(
			eventId,
			searchText,
		)
		this.logger.log(`Found ${registrationIds.length} matching registration IDs`)

		const results: CompleteRegistration[] = []
		for (const registrationId of registrationIds) {
			const regWithCourse = await this.repository.findRegistrationWithCourse(registrationId)
			if (!regWithCourse) continue

			const result = toRegistration(regWithCourse.registration)
			if (regWithCourse.course) {
				result.course = toCourse(regWithCourse.course)
			}

			const slotRows = await this.repository.findSlotsWithPlayerAndHole(registrationId)
			const slots = hydrateSlotsWithPlayerAndHole(slotRows)

			const slotIds = slots
				.filter((s): s is RegistrationSlot & { id: number } => s.id !== undefined)
				.map((s) => s.id)
			const feeRows = await this.repository.findFeesWithEventFeeAndFeeType(slotIds)

			attachFeesToSlots(slots, feeRows)

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

	/** Update player's Golf Genius ID. */
	async updatePlayerGgId(playerId: number, ggId: string): Promise<Player> {
		const row = await this.repository.updatePlayer(playerId, { ggId })
		return toPlayer(row)
	}

	/** Update slot's Golf Genius ID. */
	async updateRegistrationSlotGgId(slotId: number, ggId: string): Promise<RegistrationSlot> {
		const row = await this.repository.updateRegistrationSlot(slotId, { ggId })
		return toRegistrationSlot(row)
	}

	/** Get ggId-to-player mapping for event. */
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

	/** Get available slot groups for event/course. */
	async getAvailableSlots(
		eventId: number,
		courseId: number,
		players: number,
	): Promise<AvailableSlotGroup[]> {
		const slotRows = await this.repository.findAvailableSlots(eventId, courseId)

		const groups = new Map<string, RegistrationSlot[]>()
		for (const row of slotRows) {
			const holeNumber = row.hole.holeNumber
			const key = `${row.slot.holeId}-${holeNumber}-${row.slot.startingOrder}`
			if (!groups.has(key)) {
				groups.set(key, [])
			}
			const slot = toRegistrationSlot(row.slot)
			slot.hole = toHole(row.hole)
			groups.get(key)!.push(slot)
		}

		const result: AvailableSlotGroup[] = []
		for (const [key, slots] of groups) {
			if (slots.length >= players) {
				const [holeId, holeNumber, startingOrder] = key.split("-").map(Number)
				result.push({
					holeId,
					holeNumber,
					startingOrder,
					slots,
				})
			}
		}

		return result
	}

	/** Reserve slots for a new registration. */
	async reserveSlots(eventId: number, slotIds: number[]): Promise<number> {
		const registrationId = await this.drizzle.db.transaction(async (tx) => {
			const [registrationResult] = await tx.insert(registration).values({
				eventId,
				createdDate: toDbString(new Date()),
			})
			const regId = Number(registrationResult.insertId)

			const updateResult = await tx
				.update(registrationSlot)
				.set({
					registrationId: regId,
					status: RegistrationStatusChoices.PENDING,
				})
				.where(
					and(
						inArray(registrationSlot.id, slotIds),
						eq(registrationSlot.eventId, eventId),
						eq(registrationSlot.status, RegistrationStatusChoices.AVAILABLE),
					),
				)

			const updateResultAny = updateResult as unknown
			this.logger.debug("Update result: " + JSON.stringify(updateResultAny))

			if (
				(updateResult as [{ affectedRows: number }, unknown])[0].affectedRows !== slotIds.length
			) {
				throw new BadRequestException("Not all requested slots are available!")
			}

			return regId
		})

		this.broadcast.notifyChange(eventId)
		return registrationId
	}

	/** Remove players from a registration. */
	async dropPlayers(registrationId: number, slotIds: number[]): Promise<number> {
		if (!slotIds.length) {
			throw new BadRequestException("At least one slot ID is required")
		}

		const allPlayerSlots = await this.repository.findSlotsWithPlayerAndHole(registrationId)
		const playerSlots = allPlayerSlots.filter((s) => slotIds.includes(s.slot.id))

		if (playerSlots.length !== slotIds.length) {
			throw new BadRequestException(
				`Not all slots provided belong to registration ${registrationId}`,
			)
		}
		if (playerSlots.some((row) => !row.player)) {
			throw new BadRequestException("Not all slots provided have a player assigned")
		}
		if (playerSlots.some((row) => row.slot.status !== RegistrationStatusChoices.RESERVED)) {
			throw new BadRequestException(
				`Not all slots provided have status ${RegistrationStatusChoices.RESERVED}`,
			)
		}

		const registrationRecord = await this.repository.findRegistrationById(registrationId)
		if (!registrationRecord) {
			throw new NotFoundException(`Registration ${registrationId} not found`)
		}

		const eventRecord = await this.events.getCompleteClubEventById(
			registrationRecord.eventId,
			false,
		)

		const droppedPlayerNames = playerSlots.map((row) => {
			const p = row.player
			return p ? `${p.firstName} ${p.lastName}`.trim() : "Unknown Player"
		})
		const currentNotes = registrationRecord.notes || ""
		const dropDate = new Date().toISOString().split("T")[0]
		const newNotes =
			`${currentNotes}\nDropped ${droppedPlayerNames.join(", ")} on ${dropDate}`.trim()

		await this.drizzle.db.transaction(async (tx) => {
			await tx
				.update(registration)
				.set({ notes: newNotes })
				.where(eq(registration.id, registrationId))

			await tx
				.update(registrationFee)
				.set({ registrationSlotId: null })
				.where(inArray(registrationFee.registrationSlotId, slotIds))

			if (eventRecord.canChoose) {
				await tx
					.update(registrationSlot)
					.set({
						registrationId: null,
						playerId: null,
						status: RegistrationStatusChoices.AVAILABLE,
					})
					.where(inArray(registrationSlot.id, slotIds))
			} else {
				await tx.delete(registrationSlot).where(inArray(registrationSlot.id, slotIds))
			}

			// Remove member flag if this is a season registration
			if (eventRecord.eventType === EventTypeChoices.SEASON_REGISTRATION) {
				await tx
					.update(player)
					.set({ isMember: 0 }) // TODO: last season - good reason to break this out to a separate table
					.where(
						inArray(
							player.id,
							playerSlots.map((s) => s.player?.id ?? -1),
						),
					)
			}
		})

		if (eventRecord.canChoose) {
			this.broadcast.notifyChange(eventRecord.id)
		}

		return slotIds.length
	}

	/** Replace a player in a registration slot. */
	async replacePlayer(
		eventId: number,
		request: ReplacePlayerRequest,
	): Promise<ReplacePlayerResponse> {
		const { slotId, originalPlayerId, replacementPlayerId } = request

		// Validate slot exists
		let slotRow
		try {
			slotRow = await this.repository.findRegistrationSlotById(slotId)
		} catch {
			throw new BadRequestException(`Slot ${slotId} not found`)
		}

		// Validate slot belongs to this event
		if (slotRow.eventId !== eventId) {
			throw new BadRequestException(`Slot ${slotId} does not belong to event ${eventId}`)
		}

		// Validate slot status is Reserved
		if (slotRow.status !== RegistrationStatusChoices.RESERVED) {
			throw new BadRequestException(
				`Slot ${slotId} status must be Reserved, but is ${slotRow.status}`,
			)
		}

		// Validate original player matches slot
		if (slotRow.playerId !== originalPlayerId) {
			throw new BadRequestException(
				`Slot ${slotId} is assigned to player ${slotRow.playerId}, not ${originalPlayerId}`,
			)
		}

		// Validate replacement player is not already registered for event
		const registeredPlayers = await this.repository.findRegisteredPlayers(eventId)
		const isAlreadyRegistered = registeredPlayers.some((p) => p.id === replacementPlayerId)
		if (isAlreadyRegistered) {
			throw new BadRequestException(
				`Player ${replacementPlayerId} is already registered for event ${eventId}`,
			)
		}

		// Fetch player and registration records for audit trail
		const originalPlayer = await this.repository.findPlayerById(originalPlayerId)
		const replacementPlayer = await this.repository.findPlayerById(replacementPlayerId)
		const registrationRecord = await this.repository.findRegistrationById(slotRow.registrationId!)

		if (!registrationRecord) {
			throw new BadRequestException(
				`Registration ${slotRow.registrationId} not found for slot ${slotId}`,
			)
		}

		// Calculate green fee difference
		const eventRecord = await this.events.getCompleteClubEventById(eventId, false)
		const greenFeeEventFee = eventRecord.eventFees.find((ef) => ef.feeType?.code === "GREENS")
		let greenFeeDifference: number | undefined = undefined

		if (greenFeeEventFee) {
			const eventDate = new Date(eventRecord.startDate)
			const originalFee = getAmount(greenFeeEventFee, toPlayer(originalPlayer), eventDate)
			const replacementFee = getAmount(greenFeeEventFee, toPlayer(replacementPlayer), eventDate)
			greenFeeDifference = replacementFee - originalFee
		}

		// Build audit notes
		const originalName = `${originalPlayer.firstName} ${originalPlayer.lastName}`.trim()
		const replacementName = `${replacementPlayer.firstName} ${replacementPlayer.lastName}`.trim()
		const replaceDate = new Date().toISOString().split("T")[0]
		const currentNotes = registrationRecord.notes || ""

		let auditNotes = `Replaced ${originalName} with ${replacementName} on ${replaceDate}`
		if (request.notes) {
			auditNotes += ` - ${request.notes}`
		}
		const newNotes = `${currentNotes}\n${auditNotes}`.trim()

		// Execute replacement in transaction
		await this.drizzle.db.transaction(async (tx) => {
			await this.repository.updateRegistrationSlot(slotId, { playerId: replacementPlayerId }, tx)
			await tx
				.update(registration)
				.set({ notes: newNotes })
				.where(eq(registration.id, slotRow.registrationId!))
		})

		return {
			slotId,
			greenFeeDifference,
		}
	}
}

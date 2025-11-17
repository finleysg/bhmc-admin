import { and, eq, inArray, isNotNull, like, or } from "drizzle-orm"

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import {
	AddAdminRegistrationDto,
	EventPlayerFeeDto,
	EventPlayerSlotDto,
	HoleDto,
	PlayerDto,
	PlayerMap,
	PlayerRecord,
	RegistrationDto,
	RegistrationSlotDto,
	SearchPlayersDto,
} from "@repo/domain"

import { CoursesService } from "../courses"
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
import { getStart } from "./domain/event.domain"
import { getGroup } from "./domain/group.domain"
import { toEventDomain, toHoleDomain, toPlayerDomain, toSlotDomain } from "./domain/mappers"
import { getAge, getFullName } from "./domain/player.domain"
import {
	mapToCourseDto,
	mapToPlayerDto,
	mapToRegistrationDto,
	mapToRegistrationSlotDto,
} from "./dto/mappers"
import { RegisteredPlayerDto } from "./dto/registered-player.dto"

@Injectable()
export class RegistrationService {
	constructor(
		private readonly courses: CoursesService,
		private drizzle: DrizzleService,
		private readonly events: EventsService,
	) {}

	async getPlayers(eventId: number): Promise<EventPlayerSlotDto[]> {
		const event = await this.events.findEventById({ eventId })
		if (!event) throw new Error(`Event ${eventId} not found`)

		const eventFees = await this.events.listEventFeesByEvent(eventId)
		const slots = await this.getRegisteredPlayers(eventId)

		if (!slots || slots.length === 0) return []

		// convert event to domain model
		const eventDomain = toEventDomain(event)

		// Build registration groups (registrationId => SlotWithRelations[])
		const regGroups = new Map<number, RegisteredPlayerDto[]>()
		for (const s of slots) {
			if (!s) continue
			const regId = s.registration?.id ?? null
			if (regId === null) continue
			const arr = regGroups.get(regId) ?? []
			arr.push(s)
			regGroups.set(regId, arr)
		}

		// Collect unique courseIds to fetch holes
		const courseIdSet = new Set<number>()
		for (const s of slots) {
			if (!s) continue
			const cid = s.course?.id ?? s.registration?.courseId
			if (cid !== null && cid !== undefined) courseIdSet.add(cid)
		}

		const courseIds = Array.from(courseIdSet)
		const holesMap = new Map<number, HoleDto[]>()
		await Promise.all(
			courseIds.map(async (cid) => {
				const holes = await this.courses.findHolesByCourseId(cid)
				holesMap.set(cid, holes ?? [])
			}),
		)

		const transformed = slots.map((s): EventPlayerSlotDto => {
			if (!s) throw new Error("Unexpected missing slot data")
			const slot = s.slot
			const player = s.player
			const registration = s.registration
			const course = s.course

			if (!player) throw new Error(`Missing player for slot id ${slot?.id}`)
			if (!registration) throw new Error(`Missing registration for slot id ${slot?.id}`)

			// If the event does not allow choosing a course, there will be no course info.
			// In that case we return "N/A" for course/start values. Otherwise require course.
			let courseName = "N/A"
			let holes: HoleDto[] = []
			if (eventDomain.canChoose) {
				if (!course) throw new Error(`Missing course for slot id ${slot?.id}`)
				courseName = course.name
				holes = holesMap.get(course.id) ?? []
			}
			// convert holes to domain model array when used

			const slotDomain = toSlotDomain(slot)
			const holesDomain = holes.map(toHoleDomain)
			const startValue = getStart(eventDomain, slotDomain, holesDomain)
			const allSlotsInRegistration = (regGroups.get(registration.id) ?? []).map(
				(x: RegisteredPlayerDto) => toSlotDomain(x.slot),
			)

			const team = getGroup(eventDomain, slotDomain, startValue, courseName, allSlotsInRegistration)

			const playerDomain = toPlayerDomain(player)
			const ageRes = getAge(playerDomain, new Date())
			const age = typeof ageRes.age === "number" ? ageRes.age : 0

			const fullName = getFullName(playerDomain)

			// Build fees array from the fee definitions
			const fees: EventPlayerFeeDto[] = eventFees.map((fd) => {
				const fee = (s.fees ?? []).find((f) => f.eventFee?.id === fd.id)
				const paid = fee?.isPaid === 1
				const amount = paid ? fee?.amount : "0"
				return {
					name: fd.feeType!.name,
					amount,
				}
			})

			return {
				team,
				course: courseName,
				start: startValue,
				ghin: player.ghin,
				age,
				tee: player.tee,
				lastName: player.lastName,
				firstName: player.firstName,
				fullName,
				email: player.email,
				signedUpBy: registration.signedUpBy,
				fees,
			}
		})

		return transformed
	}

	async getRegisteredPlayers(eventId: number): Promise<RegisteredPlayerDto[]> {
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

		const slotsMap = new Map<number, RegisteredPlayerDto>()
		const slotIds: number[] = []
		for (const row of rows) {
			const sid = row.slot.id
			slotIds.push(sid)
			slotsMap.set(sid, {
				slot: mapToRegistrationSlotDto(row.slot),
				player: row.player ? mapToPlayerDto(row.player) : undefined,
				registration: row.registration ? mapToRegistrationDto(row.registration) : undefined,
				course: row.course ? mapToCourseDto(row.course) : undefined,
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

			parent.fees.push({
				id: frow.fee.id,
				isPaid: frow.fee.isPaid,
				eventFeeId: frow.fee.eventFeeId,
				paymentId: frow.fee.paymentId,
				registrationSlotId: frow.fee.registrationSlotId!,
				amount: frow.fee.amount,
				eventFee: frow.eventFee!,
			})
		}

		return slotIds.map((id) => slotsMap.get(id)!)
	}

	// register_player
	async findPlayerById(id: number): Promise<PlayerDto | null> {
		const [p] = await this.drizzle.db.select().from(player).where(eq(player.id, id)).limit(1)
		return p ? mapToPlayerDto(p) : null
	}

	async findMemberPlayers(): Promise<PlayerDto[]> {
		const players = await this.drizzle.db.select().from(player).where(eq(player.isMember, 1))
		return players.map(mapToPlayerDto)
	}

	async searchPlayers(dto: SearchPlayersDto): Promise<PlayerDto[]> {
		const { searchText, isMember = true } = dto
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
		return results.map(mapToPlayerDto)
	}

	async searchEventPlayers(
		eventId: number,
		dto: SearchPlayersDto,
	): Promise<Array<{ player: PlayerDto; group?: RegistrationDto }>> {
		const { searchText, includeGroup = true } = dto

		// Build where conditions
		let whereConditions = and(
			eq(registrationSlot.eventId, eventId),
			eq(registrationSlot.status, "R"),
			isNotNull(registrationSlot.playerId),
		)

		if (searchText) {
			const search = `%${searchText}%`
			whereConditions = and(
				whereConditions,
				or(
					like(player.firstName, search),
					like(player.lastName, search),
					like(player.ghin, search),
				),
			)
		}

		// First, get matching players with their slots
		const rows = await this.drizzle.db
			.select({
				player: player,
				slot: registrationSlot,
			})
			.from(player)
			.innerJoin(registrationSlot, eq(player.id, registrationSlot.playerId))
			.where(whereConditions)

		const playersWithSlots = rows.map((row) => ({
			player: mapToPlayerDto(row.player),
			slot: row.slot,
		}))

		if (!includeGroup) {
			return playersWithSlots.map(({ player }) => ({ player }))
		}

		// Get unique registration IDs
		const regIds = [
			...new Set(playersWithSlots.map((p) => p.slot.registrationId).filter(Boolean)),
		] as number[]

		if (regIds.length === 0) {
			return playersWithSlots.map(({ player }) => ({ player }))
		}

		// Fetch registrations with course and all slots
		const regRows = await this.drizzle.db
			.select({
				reg: registration,
				course: course,
				slot: registrationSlot,
			})
			.from(registration)
			.leftJoin(course, eq(registration.courseId, course.id))
			.innerJoin(registrationSlot, eq(registration.id, registrationSlot.registrationId))
			.where(inArray(registration.id, regIds))

		// Group by registration ID
		const groupsMap = new Map<
			number,
			{
				reg: typeof registration.$inferSelect
				course?: typeof course.$inferSelect
				slots: (typeof registrationSlot.$inferSelect)[]
			}
		>()
		for (const row of regRows) {
			const rid = row.reg.id
			if (!groupsMap.has(rid)) {
				groupsMap.set(rid, { reg: row.reg, course: row.course || undefined, slots: [] })
			}
			groupsMap.get(rid)!.slots.push(row.slot)
		}

		// Fetch fees for all slots in groups
		const allSlotIds = Array.from(groupsMap.values()).flatMap((data) => data.slots.map((s) => s.id))
		const feesMap = new Map<number, any[]>()
		if (allSlotIds.length > 0) {
			const feeRows = await this.drizzle.db
				.select({
					fee: registrationFee,
					eventFee: eventFee,
					feeType: feeType,
				})
				.from(registrationFee)
				.leftJoin(eventFee, eq(registrationFee.eventFeeId, eventFee.id))
				.leftJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
				.where(inArray(registrationFee.registrationSlotId, allSlotIds))

			for (const frow of feeRows) {
				const sid = frow.fee.registrationSlotId
				if (sid) {
					if (!feesMap.has(sid)) feesMap.set(sid, [])
					feesMap.get(sid)!.push({
						id: frow.fee.id,
						isPaid: frow.fee.isPaid,
						eventFeeId: frow.fee.eventFeeId,
						paymentId: frow.fee.paymentId,
						registrationSlotId: frow.fee.registrationSlotId,
						amount: frow.fee.amount,
						eventFee: frow.eventFee!,
						feeType: frow.feeType!,
					})
				}
			}
		}

		// Build RegisteredGroupDto for each
		const groups = new Map<number, RegistrationDto>()
		for (const [rid, data] of groupsMap) {
			groups.set(rid, {
				id: data.reg.id,
				eventId: eventId,
				startingHole: data.reg.startingHole,
				startingOrder: data.reg.startingOrder,
				notes: data.reg.notes,
				course: data.course ? (mapToCourseDto(data.course) as any) : undefined,
				signedUpBy: data.reg.signedUpBy || "",
				userId: data.reg.userId || 0,
				createdDate: data.reg.createdDate,
				slots: data.slots.map((s) => mapToRegistrationSlotDto(s)),
			})
		}

		// Attach groups to players
		return playersWithSlots.map(({ player, slot }) => ({
			player,
			group: slot.registrationId ? groups.get(slot.registrationId) : undefined,
		}))
	}

	async updatePlayerGgId(playerId: number, ggId: string): Promise<PlayerDto | null> {
		await this.drizzle.db.update(player).set({ ggId }).where(eq(player.id, playerId))
		return this.findPlayerById(playerId)
	}

	/**
	 * Update the ggId on a registration slot.
	 * Returns the updated slot or null if not found.
	 */
	async updateRegistrationSlotGgId(
		slotId: number,
		ggId: string,
	): Promise<RegistrationSlotDto | null> {
		await this.drizzle.db
			.update(registrationSlot)
			.set({ ggId })
			.where(eq(registrationSlot.id, slotId))

		const [slot] = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(eq(registrationSlot.id, slotId))
			.limit(1)
		return slot ? mapToRegistrationSlotDto(slot) : null
	}

	async findRegistrationSlotById(slotId: number): Promise<RegistrationSlotDto | null> {
		const [slot] = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(eq(registrationSlot.id, slotId))
			.limit(1)
		return slot ? mapToRegistrationSlotDto(slot) : null
	}

	async findRegistrationSlotByEventAndExternalId(
		eventId: number,
		externalId: string,
	): Promise<RegistrationSlotDto | null> {
		const [slot] = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(and(eq(registrationSlot.eventId, eventId), eq(registrationSlot.ggId, externalId)))
			.limit(1)
		return slot ? mapToRegistrationSlotDto(slot) : null
	}

	async findRegistrationSlotByGgId(ggId: string): Promise<RegistrationSlotDto | null> {
		const [slot] = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(eq(registrationSlot.ggId, ggId))
			.limit(1)
		return slot ? mapToRegistrationSlotDto(slot) : null
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

	async createAdminRegistration(eventId: number, dto: AddAdminRegistrationDto): Promise<number> {
		// Fetch event
		const eventRecord = await this.events.findEventById({
			eventId,
			includeCourses: true,
			includeFees: true,
		})

		// Validation
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
			const firstSlot = await this.findRegistrationSlotById(firstSlotId)

			// Find courseId from the first slot
			const holeData = eventRecord.courses
				?.flatMap((c) => c.holes)
				.find((h) => h?.id === firstSlot?.holeId)
			courseId = holeData?.courseId || null
		}

		// Calculate payment amount using preloaded eventFees
		const allEventFeeIds = dto.slots.flatMap((s) => s.eventFeeIds)
		const uniqueEventFeeIds = [...new Set(allEventFeeIds)]
		let totalAmount = "0.00"
		for (const feeId of uniqueEventFeeIds) {
			const fee = eventRecord.eventFees?.find((f) => f.id === feeId)
			if (fee) {
				const amount = parseFloat(fee.amount)
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

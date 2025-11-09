import { and, eq, inArray, isNotNull } from "drizzle-orm"

import { Injectable } from "@nestjs/common"
import { PlayerMap, PlayerRecord } from "@repo/dto"

import {
	course,
	DrizzleService,
	eventFee,
	feeType,
	player,
	registration,
	registrationFee,
	registrationSlot,
} from "../database"
import {
	mapToCourseDto,
	mapToPlayerDto,
	mapToRegistrationDto,
	mapToRegistrationSlotDto,
} from "./dto/mappers"
import { PlayerDto } from "./dto/player.dto"
import { RegisteredPlayerDto } from "./dto/registered-player.dto"
import { RegistrationSlotDto } from "./dto/registration-slot.dto"

@Injectable()
export class RegistrationService {
	constructor(private drizzle: DrizzleService) {}

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
				registrationSlotId: frow.fee.registrationSlotId,
				amount: frow.fee.amount,
				fee: frow.fee,
				eventFee: frow.eventFee!,
				feeType: frow.feeType!,
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
}

import { and, eq, inArray } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import { RegistrationStatus } from "@repo/domain/types"

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
} from "../database"
import {
	PlayerModel,
	playerUpdateSchema,
	RegistrationFeeModel,
	RegistrationModel,
	RegistrationSlotModel,
	registrationSlotUpdateSchema,
} from "../database/models"
import {
	mapToFeesWithEventFeeAndFeeType,
	mapToPlayerModel,
	mapToRegistrationSlotModel,
	mapToRegistrationWithCourse,
	mapToSlotsWithPlayerAndHole,
} from "./mappers"
import { mapToHoleModel } from "../courses/mappers"

@Injectable()
export class RegistrationRepository {
	constructor(private drizzle: DrizzleService) {}

	// register_player
	async findPlayerById(id: number): Promise<PlayerModel> {
		const p = await this.drizzle.db.select().from(player).where(eq(player.id, id)).limit(1)
		if (!p) {
			throw new Error(`No player found with id ${id}`)
		}
		return mapToPlayerModel(p)
	}

	/**
	 * Batch fetch players by IDs.
	 */
	async findPlayersByIds(ids: number[]): Promise<PlayerModel[]> {
		if (!ids.length) return []
		const results = await this.drizzle.db.select().from(player).where(inArray(player.id, ids))
		return results.map(mapToPlayerModel)
	}

	async findMemberPlayers(): Promise<PlayerModel[]> {
		const players = await this.drizzle.db.select().from(player).where(eq(player.isMember, 1))
		return players.map(mapToPlayerModel)
	}

	async updatePlayer(playerId: number, model: PlayerModel): Promise<PlayerModel> {
		const entity = playerUpdateSchema.parse(model)
		await this.drizzle.db.update(player).set(entity).where(eq(player.id, playerId))
		return this.findPlayerById(playerId)
	}

	/**
	 * Update a registration slot.
	 */
	async updateRegistrationSlot(
		slotId: number,
		model: RegistrationSlotModel,
	): Promise<RegistrationSlotModel> {
		const entity = registrationSlotUpdateSchema.parse(model)
		await this.drizzle.db
			.update(registrationSlot)
			.set(entity)
			.where(eq(registrationSlot.id, slotId))

		return this.findRegistrationSlotById(slotId)
	}

	async findRegistrationSlotById(slotId: number): Promise<RegistrationSlotModel> {
		const [slot] = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(eq(registrationSlot.id, slotId))
			.limit(1)
		if (!slot) {
			throw new Error(`No registration slot found with id ${slotId}`)
		}
		return mapToRegistrationSlotModel(slot)
	}

	async findRegistrationSlotByGgId(ggId: string): Promise<RegistrationSlotModel | null> {
		const [slot] = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(eq(registrationSlot.ggId, ggId))
			.limit(1)
		return slot ? mapToRegistrationSlotModel(slot) : null
	}

	/**
	 * Find the registration ID for a given event and player.
	 * Returns null if player is not registered for the event.
	 */
	async findRegistrationIdByEventAndPlayer(
		eventId: number,
		playerId: number,
	): Promise<number | null> {
		const [slot] = await this.drizzle.db
			.select()
			.from(registrationSlot)
			.where(and(eq(registrationSlot.eventId, eventId), eq(registrationSlot.playerId, playerId)))
			.limit(1)

		return slot?.registrationId ?? null
	}

	/**
	 * Find a registration with its associated course.
	 * Returns null if registration not found.
	 */
	async findRegistrationWithCourse(registrationId: number): Promise<RegistrationModel | null> {
		const [result] = await this.drizzle.db
			.select({
				registration: registration,
				course: course,
			})
			.from(registration)
			.leftJoin(course, eq(registration.courseId, course.id))
			.where(eq(registration.id, registrationId))
			.limit(1)

		return result ? mapToRegistrationWithCourse(result) : null
	}

	/**
	 * Find all slots for a registration with associated player and hole data.
	 */
	async findSlotsWithPlayerAndHole(registrationId: number): Promise<RegistrationSlotModel[]> {
		const results = await this.drizzle.db
			.select({
				slot: registrationSlot,
				player: player,
				hole: hole,
			})
			.from(registrationSlot)
			.leftJoin(player, eq(registrationSlot.playerId, player.id))
			.leftJoin(hole, eq(registrationSlot.holeId, hole.id))
			.where(eq(registrationSlot.registrationId, registrationId))

		return mapToSlotsWithPlayerAndHole(results)
	}

	/**
	 * Find all fees for given slot IDs with associated eventFee and feeType data.
	 */
	async findFeesWithEventFeeAndFeeType(slotIds: number[]): Promise<RegistrationFeeModel[]> {
		if (slotIds.length === 0) {
			return []
		}

		const results = await this.drizzle.db
			.select({
				fee: registrationFee,
				eventFee: eventFee,
				feeType: feeType,
			})
			.from(registrationFee)
			.leftJoin(eventFee, eq(registrationFee.eventFeeId, eventFee.id))
			.leftJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
			.where(inArray(registrationFee.registrationSlotId, slotIds))

		return mapToFeesWithEventFeeAndFeeType(results)
	}

	/**
	 * Find available slots for an event and course.
	 * Returns slots with status 'A' (Available) for the given event and course.
	 * NOTE: holeId is nullable, but for events where players choose their own tee times,
	 * all slots should have a holeId assigned.
	 */
	async findAvailableSlots(eventId: number, courseId: number): Promise<RegistrationSlotModel[]> {
		const results = await this.drizzle.db
			.select({
				slot: registrationSlot,
				hole: hole,
			})
			.from(registrationSlot)
			.innerJoin(hole, eq(registrationSlot.holeId, hole.id))
			.where(
				and(
					eq(registrationSlot.eventId, eventId),
					eq(registrationSlot.status, RegistrationStatus.AVAILABLE),
					eq(hole.courseId, courseId),
				),
			)

		return results.map((result) => {
			const slotModel = mapToRegistrationSlotModel(result.slot)
			slotModel.hole = result.hole ? mapToHoleModel(result.hole) : undefined
			return slotModel
		})
	}
}

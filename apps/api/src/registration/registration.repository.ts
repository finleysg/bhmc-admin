import { eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import { DrizzleService, player, registrationSlot } from "../database"
import {
	PlayerModel,
	playerUpdateSchema,
	RegistrationSlotModel,
	registrationSlotUpdateSchema,
} from "../database/models"
import { mapToPlayerModel, mapToRegistrationSlotModel } from "./mappers"

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
}

import { and, asc, eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import { champion, DrizzleService, lowScore } from "../database"
import {
	championInsertSchema,
	ChampionModel,
	lowScoreInsertSchema,
	LowScoreModel,
} from "../database/models"
import { mapToChampionModel, mapToLowScoreModel } from "./mappers"

@Injectable()
export class CoreRepository {
	constructor(private drizzle: DrizzleService) {}

	async findLowScores(
		season: number,
		courseName: string,
		isNet: boolean,
	): Promise<LowScoreModel[]> {
		const results = await this.drizzle.db
			.select()
			.from(lowScore)
			.where(
				and(
					eq(lowScore.season, season),
					eq(lowScore.courseName, courseName),
					eq(lowScore.isNet, isNet ? 1 : 0),
				),
			)
			.orderBy(asc(lowScore.score))
		return results.map(mapToLowScoreModel)
	}

	async createLowScore(model: LowScoreModel): Promise<LowScoreModel> {
		const data = lowScoreInsertSchema.parse(model)
		const [result] = await this.drizzle.db.insert(lowScore).values(data)
		return this.findLowScoreById(result.insertId)
	}

	async findLowScoreById(id: number): Promise<LowScoreModel> {
		const [lowScoreData] = await this.drizzle.db
			.select()
			.from(lowScore)
			.where(eq(lowScore.id, id))
			.limit(1)
		if (lowScoreData) {
			return mapToLowScoreModel(lowScoreData)
		}
		throw new Error(`No low score found for id ${id}.`)
	}

	async deleteLowScores(season: number, courseName: string, isNet: boolean): Promise<void> {
		await this.drizzle.db
			.delete(lowScore)
			.where(
				and(
					eq(lowScore.season, season),
					eq(lowScore.courseName, courseName),
					eq(lowScore.isNet, isNet ? 1 : 0),
				),
			)
	}

	async existsLowScore(
		season: number,
		courseName: string,
		isNet: boolean,
		playerId: number,
	): Promise<boolean> {
		const existing = await this.drizzle.db
			.select({ id: lowScore.id })
			.from(lowScore)
			.where(
				and(
					eq(lowScore.season, season),
					eq(lowScore.courseName, courseName),
					eq(lowScore.isNet, isNet ? 1 : 0),
					eq(lowScore.playerId, playerId),
				),
			)
			.limit(1)
		return existing.length > 0
	}

	async findChampionById(id: number): Promise<ChampionModel> {
		const [championData] = await this.drizzle.db
			.select()
			.from(champion)
			.where(eq(champion.id, id))
			.limit(1)
		if (championData) {
			return mapToChampionModel(championData)
		}
		throw new Error(`No champion found for id ${id}.`)
	}

	async findChampions(eventId: number): Promise<ChampionModel[]> {
		const results = await this.drizzle.db
			.select()
			.from(champion)
			.where(eq(champion.eventId, eventId))
			.orderBy(asc(champion.flight), asc(champion.score))
		return results.map(mapToChampionModel)
	}

	async createChampion(model: ChampionModel): Promise<ChampionModel> {
		const data = championInsertSchema.parse(model)
		const [result] = await this.drizzle.db.insert(champion).values(data)
		return this.findChampionById(result.insertId)
	}

	async deleteChampions(eventId: number): Promise<void> {
		await this.drizzle.db.delete(champion).where(eq(champion.eventId, eventId))
	}
}

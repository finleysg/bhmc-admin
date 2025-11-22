import { and, eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import { DrizzleService, lowScore } from "../database"
import { lowScoreInsertSchema, LowScoreModel } from "../database/models"
import { mapToLowScoreModel } from "./mappers"

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
}

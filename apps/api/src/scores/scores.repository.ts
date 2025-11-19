import { and, eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import { DrizzleService, eventScore, eventScorecard } from "../database"
import {
	scorecardInsertSchema,
	ScorecardModel,
	scorecardUpdateSchema,
	scoreInsertSchema,
	ScoreModel,
} from "../database/models"
import { mapToScorecardModel } from "./mappers"

@Injectable()
export class ScoresRepository {
	constructor(private drizzle: DrizzleService) {}

	async createScorecard(scorecard: ScorecardModel) {
		const data = scorecardInsertSchema.parse(scorecard)
		const [result] = await this.drizzle.db.insert(eventScorecard).values(data)
		return this.findScorecardById(result.insertId)
	}

	async findScorecardById(id: number) {
		const [scorecard] = await this.drizzle.db
			.select()
			.from(eventScorecard)
			.where(eq(eventScorecard.id, id))
			.limit(1)
		if (scorecard) {
			return mapToScorecardModel(scorecard)
		}
		throw new Error(`No scorecard found for id ${id}.`)
	}

	async findScorecard(eventId: number, playerId: number) {
		const [scorecard] = await this.drizzle.db
			.select()
			.from(eventScorecard)
			.where(and(eq(eventScorecard.eventId, eventId), eq(eventScorecard.playerId, playerId)))
			.limit(1)
		if (scorecard) {
			return mapToScorecardModel(scorecard)
		}
		return null
	}

	async updateScorecard(id: number, scorecard: ScorecardModel) {
		const data = scorecardUpdateSchema.parse(scorecard)
		await this.drizzle.db.update(eventScorecard).set(data).where(eq(eventScorecard.id, id))
		return this.findScorecardById(id)
	}

	async deleteScoresByScorecard(scorecardId: number) {
		await this.drizzle.db.delete(eventScore).where(eq(eventScore.scorecardId, scorecardId))
	}

	async batchCreateScores(scores: ScoreModel[]) {
		if (scores.length === 0) return

		const data = scores.map((s) => scoreInsertSchema.parse(s))
		await this.drizzle.db.insert(eventScore).values(data)
	}
}

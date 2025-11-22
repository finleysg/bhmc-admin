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
import { mapToScorecardModel, mapToScoreModel } from "./mappers"

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

	async findScorecardsByEventAndCourse(
		eventId: number,
		courseId: number,
		isNet: boolean,
	): Promise<ScorecardModel[]> {
		const isNetValue = isNet ? 1 : 0
		const results = await this.drizzle.db
			.select({
				score: eventScore,
				scorecard: eventScorecard,
			})
			.from(eventScorecard)
			.innerJoin(eventScore, eq(eventScore.scorecardId, eventScorecard.id))
			.where(
				and(
					eq(eventScorecard.eventId, eventId),
					eq(eventScorecard.courseId, courseId),
					eq(eventScore.isNet, isNetValue),
				),
			)

		// Group by scorecard to build nested structure
		const grouped: Map<
			number,
			{ scorecard: Record<string, unknown>; scores: Record<string, unknown>[] }
		> = new Map()
		results.forEach((r) => {
			const scorecardId = r.scorecard.id
			if (!grouped.has(scorecardId)) {
				grouped.set(scorecardId, { scorecard: r.scorecard, scores: [] })
			}
			grouped.get(scorecardId)!.scores.push(r.score)
		})

		const scorecards: ScorecardModel[] = []
		for (const { scorecard, scores } of grouped.values()) {
			const model = mapToScorecardModel(scorecard)
			model.scores = scores.map((s) => mapToScoreModel({ ...s, playerId: scorecard.playerId }))
			scorecards.push(model)
		}

		return scorecards
	}
}

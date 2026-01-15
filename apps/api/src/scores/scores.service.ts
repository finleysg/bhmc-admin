import { and, eq } from "drizzle-orm"

import { Inject, Injectable } from "@nestjs/common"

import {
	DrizzleService,
	eventScore,
	eventScorecard,
	ScorecardInsert,
	ScorecardRow,
	ScorecardWithScores,
	ScoreInsert,
	ScoreRow,
} from "../database"

@Injectable()
export class ScoresService {
	constructor(@Inject(DrizzleService) private drizzle: DrizzleService) {}

	async createScorecard(data: ScorecardInsert): Promise<ScorecardRow> {
		const [result] = await this.drizzle.db.insert(eventScorecard).values(data)
		return this.findScorecardById(result.insertId)
	}

	async findScorecardById(id: number): Promise<ScorecardRow> {
		const [scorecard] = await this.drizzle.db
			.select()
			.from(eventScorecard)
			.where(eq(eventScorecard.id, id))
			.limit(1)
		if (scorecard) {
			return scorecard
		}
		throw new Error(`No scorecard found for id ${id}.`)
	}

	async findScorecard(eventId: number, playerId: number): Promise<ScorecardRow | null> {
		const [scorecard] = await this.drizzle.db
			.select()
			.from(eventScorecard)
			.where(and(eq(eventScorecard.eventId, eventId), eq(eventScorecard.playerId, playerId)))
			.limit(1)
		if (scorecard) {
			return scorecard
		}
		return null
	}

	async updateScorecard(id: number, data: Partial<ScorecardRow>) {
		await this.drizzle.db.update(eventScorecard).set(data).where(eq(eventScorecard.id, id))
		return this.findScorecardById(id)
	}

	async deleteScoresByScorecard(scorecardId: number): Promise<void> {
		await this.drizzle.db.delete(eventScore).where(eq(eventScore.scorecardId, scorecardId))
	}

	async batchCreateScores(data: ScoreInsert[]): Promise<void> {
		if (data.length === 0) return
		await this.drizzle.db.insert(eventScore).values(data)
	}

	async findScorecardsByEventAndCourse(
		eventId: number,
		courseId: number,
		isNet: boolean,
	): Promise<ScorecardWithScores[]> {
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
		const grouped: Map<number, { scorecard: ScorecardRow; scores: ScoreRow[] }> = new Map()
		results.forEach((r) => {
			const scorecardId = r.scorecard.id
			if (!grouped.has(scorecardId)) {
				grouped.set(scorecardId, { scorecard: r.scorecard, scores: [] })
			}
			grouped.get(scorecardId)!.scores.push(r.score)
		})

		return Array.from(grouped.values()).map(({ scorecard, scores }) => ({
			...scorecard,
			scores,
		}))
	}
}

import { and, eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import { DrizzleService, eventScore, eventScorecard } from "../database"
import {
	mapScorecardDtoToEntity,
	mapScoreDtoToEntity,
	mapToScorecardDto,
	mapToScoreDto,
} from "./dto/mappers"
import { ScoreDto } from "./dto/score.dto"
import { ScorecardDto } from "./dto/scorecard.dto"

@Injectable()
export class ScoresService {
	constructor(private drizzle: DrizzleService) {}

	// Scorecard CRUD
	async createScorecard(scorecard: ScorecardDto) {
		const data = mapScorecardDtoToEntity(scorecard)
		const [result] = await this.drizzle.db.insert(eventScorecard).values(data)
		return this.findScorecardById(Number(result.insertId))
	}

	async findScorecardById(id: number) {
		const [scorecard] = await this.drizzle.db
			.select()
			.from(eventScorecard)
			.where(eq(eventScorecard.id, id))
			.limit(1)
		if (scorecard) {
			return mapToScorecardDto(scorecard)
		}
		return null
	}

	async findScorecard(eventId: number, playerId: number) {
		const [scorecard] = await this.drizzle.db
			.select()
			.from(eventScorecard)
			.where(and(eq(eventScorecard.eventId, eventId), eq(eventScorecard.playerId, playerId)))
			.limit(1)
		if (scorecard) {
			return mapToScorecardDto(scorecard)
		}
		return null
	}

	async updateScorecard(id: number, scorecard: ScorecardDto) {
		scorecard.id = id
		const data = mapScorecardDtoToEntity(scorecard)
		await this.drizzle.db.update(eventScorecard).set(data).where(eq(eventScorecard.id, id))
		return this.findScorecardById(id)
	}

	// Score CRUD
	async createScore(score: ScoreDto) {
		const data = mapScoreDtoToEntity(score)
		const [result] = await this.drizzle.db.insert(eventScore).values(data)
		return this.findScoreById(Number(result.insertId))
	}

	async findScoreById(id: number) {
		const [data] = await this.drizzle.db
			.select()
			.from(eventScore)
			.where(eq(eventScore.id, id))
			.limit(1)
		return mapToScoreDto(data)
	}

	async updateScore(id: number, score: ScoreDto) {
		score.id = id
		const data = mapScoreDtoToEntity(score)
		await this.drizzle.db.update(eventScore).set(data).where(eq(eventScore.id, id))
		return this.findScoreById(id)
	}

	async deleteScoresByScorecard(scorecardId: number) {
		await this.drizzle.db.delete(eventScore).where(eq(eventScore.scorecardId, scorecardId))
	}

	async batchCreateScores(scores: ScoreDto[]) {
		if (scores.length === 0) return

		const data = scores.map(mapScoreDtoToEntity)
		await this.drizzle.db.insert(eventScore).values(data)
	}
}

import { ScorecardModel, ScoreModel } from "../database/models"

/**
 * Maps database entity to ScoreDto
 */
export function mapToScoreModel(entity: any): ScoreModel {
	return {
		id: entity.id,
		scorecardId: entity.scorecardId,
		score: entity.score,
		isNet: entity.isNet,
		holeId: entity.holeId,
	}
}

/**
 * Maps database entity to Scorecard model
 */
export function mapToScorecardModel(entity: any): ScorecardModel {
	return {
		id: entity.id,
		handicapIndex: entity.handicapIindex,
		courseHandicap: entity.courseHandicap,
		courseId: entity.courseId,
		eventId: entity.eventId,
		playerId: entity.playerId,
		teeId: entity.teeId,
	}
}

import {
	CreateScorecardModel,
	CreateScoreModel,
	ScorecardModel,
	ScoreModel,
	UpdateScorecardModel,
} from "../../database/models"

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
 * Maps ScoreDto to database entity for insert/update
 */
export function mapScoreModelToEntity(model: CreateScoreModel): any {
	return {
		score: model.score,
		isNet: model.isNet,
		holeId: model.holeId,
		scorecardId: model.scorecardId,
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

/**
 * Maps Scorecard model to database entity for insert
 */
export function mapScorecardModelToEntity(model: CreateScorecardModel | UpdateScorecardModel): any {
	return {
		handicapIndex: model.handicapIndex,
		courseHandicap: model.courseHandicap,
		courseId: model.courseId,
		eventId: model.eventId,
		playerId: model.playerId,
		teeId: model.teeId,
	}
}

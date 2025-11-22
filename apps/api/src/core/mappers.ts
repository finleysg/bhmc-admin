import { LowScore } from "@repo/domain/types"

import { LowScoreModel } from "../database/models"
import { toPlayer } from "../registration/mappers"

/**
 * Maps database entity to LowScoreModel
 */
export function mapToLowScoreModel(entity: Record<string, any>): LowScoreModel {
	return {
		id: entity.id,
		season: entity.season,
		courseName: entity.course_name,
		score: entity.score,
		playerId: entity.player_id,
		isNet: entity.is_net,
	}
}

/**
 * Maps LowScoreModel to LowScore domain class
 */
export function toLowScore(model: LowScoreModel): LowScore {
	return {
		id: model.id,
		season: model.season,
		courseName: model.courseName,
		score: model.score,
		playerId: model.playerId,
		isNet: Boolean(model.isNet),
		player: model.player ? toPlayer(model.player) : undefined,
	} as LowScore
}

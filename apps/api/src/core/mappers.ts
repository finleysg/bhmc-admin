import { Champion, LowScore } from "@repo/domain/types"

import { ChampionModel, LowScoreModel, TournamentResultModel } from "../database/models"
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

/**
 * Maps database entity to ChampionModel
 */
export function mapToChampionModel(entity: Record<string, any>): ChampionModel {
	return {
		id: entity.id,
		season: entity.season,
		eventName: entity.eventName,
		flight: entity.flight,
		score: entity.score,
		playerId: entity.playerId,
		isNet: entity.isNet,
		eventId: entity.eventId,
		teamId: entity.teamId,
	}
}

/**
 * Maps ChampionModel to Champion domain class
 */
export function toChampion(model: ChampionModel): Champion {
	return {
		id: model.id,
		season: model.season,
		eventName: model.eventName,
		flight: model.flight,
		score: model.score,
		playerId: model.playerId,
		isNet: Boolean(model.isNet),
		eventId: model.eventId,
		teamId: model.teamId,
		player: model.player ? toPlayer(model.player) : undefined,
	}
}

/**
 * Maps tournament winner result (with player data) to ChampionModel
 */
export function mapTournamentWinnerToChampion(
	winner: TournamentResultModel,
	isNet: boolean,
	eventId: number,
	eventSeason: number,
	eventName: string,
): ChampionModel {
	// Validate required fields for champion mapping
	if (!winner) {
		throw new Error(`Winner result is null or undefined`)
	}

	if (!winner.flight) {
		throw new Error(
			`Winner (ID: ${winner.id}) has missing flight information for tournament ${winner.tournamentId}`,
		)
	}

	if (winner.score === null || winner.score === undefined) {
		throw new Error(
			`Winner (ID: ${winner.id}) has missing score for tournament ${winner.tournamentId}`,
		)
	}

	return {
		season: eventSeason,
		eventName: eventName,
		flight: winner.flight,
		score: winner.score,
		playerId: winner.playerId,
		isNet: isNet ? 1 : 0,
		eventId,
		teamId: winner.teamId,
	}
}

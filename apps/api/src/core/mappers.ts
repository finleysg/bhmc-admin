import { Champion, LowScore, Player, TournamentResults } from "@repo/domain/types"

import type { ChampionInsert, ChampionRow, LowScoreRow, PlayerRow } from "../database"
import { toPlayer } from "../registration/mappers"

/**
 * Maps LowScoreRow to LowScore domain type
 */
export function toLowScore(row: LowScoreRow, player?: Player): LowScore {
	return {
		id: row.id,
		season: row.season,
		courseName: row.courseName,
		score: row.score,
		playerId: row.playerId,
		isNet: Boolean(row.isNet),
		player,
	}
}

/**
 * Maps LowScoreRow with PlayerRow to LowScore with nested player
 */
export function toLowScoreWithPlayer(row: { lowScore: LowScoreRow; player: PlayerRow }): LowScore {
	return toLowScore(row.lowScore, toPlayer(row.player))
}

/**
 * Maps ChampionRow to Champion domain type
 */
export function toChampion(row: ChampionRow, player?: Player): Champion {
	return {
		id: row.id,
		season: row.season,
		eventName: row.eventName,
		flight: row.flight,
		score: row.score,
		playerId: row.playerId,
		isNet: Boolean(row.isNet),
		eventId: row.eventId ?? undefined,
		teamId: row.teamId ?? undefined,
		player,
	}
}

/**
 * Maps ChampionRow with PlayerRow to Champion with nested player
 */
export function toChampionWithPlayer(row: { champion: ChampionRow; player: PlayerRow }): Champion {
	return toChampion(row.champion, toPlayer(row.player))
}

/**
 * Maps tournament winner result to ChampionInsert for database insertion
 */
export function mapTournamentWinnerToChampionInsert(
	winner: TournamentResults,
	isNet: boolean,
	eventId: number,
	eventSeason: number,
	eventName: string,
	defaultFlight?: string,
): ChampionInsert {
	if (!winner) {
		throw new Error(`Winner result is null or undefined`)
	}

	const flight = winner.flight || defaultFlight
	if (!flight) {
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
		flight,
		score: winner.score,
		playerId: winner.playerId,
		isNet: isNet ? 1 : 0,
		eventId,
		teamId: truncateTeamId(winner.teamId),
	}
}

// core_majorchampion.team_id is varchar(8); Golf Genius team ids (aggregate.id_str)
// can be much longer (e.g. 20-digit numeric). Keep the last 8 chars so rows for
// the same team still share a stable key.
function truncateTeamId(teamId: string | undefined): string | undefined {
	if (!teamId) return teamId
	return teamId.length <= 8 ? teamId : teamId.slice(-8)
}

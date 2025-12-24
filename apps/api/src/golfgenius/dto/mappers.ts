import {
	ClubEvent,
	PreparedTournamentPoints,
	PreparedTournamentResult,
	Tournament,
	TournamentData,
} from "@repo/domain/types"

import type { TournamentPointsInsert, TournamentResultInsert } from "../../database"

/**
 * TODO: this belongs to the events module?
 * Maps PreparedTournamentResult to TournamentResultInsert for database insertion.
 */
export function mapPreparedResultsToTournamentResultInsert(
	record: PreparedTournamentResult,
): TournamentResultInsert {
	return {
		tournamentId: record.tournamentId,
		playerId: record.playerId,
		flight: record.flight ?? undefined,
		position: record.position,
		score: record.score ?? undefined,
		amount: record.amount,
		details: record.details ?? undefined,
		summary: record.summary ?? undefined,
		createDate: record.createDate,
		payoutDate: record.payoutDate ?? undefined,
		payoutStatus: record.payoutStatus ?? undefined,
		payoutTo: record.payoutTo ?? undefined,
		payoutType: record.payoutType ?? undefined,
		teamId: record.teamId ?? undefined,
	}
}

/**
 * TODO: this belongs to the events module?
 * Maps PreparedTournamentPoints to TournamentPointsInsert for database insertion.
 */
export function mapPreparedPointsToTournamentPointsInsert(
	record: PreparedTournamentPoints,
): TournamentPointsInsert {
	return {
		tournamentId: record.tournamentId,
		playerId: record.playerId,
		position: record.position,
		score: record.score ?? undefined,
		points: record.points,
		details: record.details ?? undefined,
		createDate: record.createDate,
	}
}

/**
 * Maps Tournament and ClubEvent domain objects to TournamentData for Golf Genius integration.
 * Asserts that the event has exactly one eventRound.
 */
export function toTournamentData(tournament: Tournament, event: ClubEvent): TournamentData {
	if (!event.eventRounds || event.eventRounds.length !== 1) {
		throw new Error(
			`toTournamentData mapping requires exactly one event round, but event ${event.id} has ${event.eventRounds?.length ?? 0} rounds`,
		)
	}

	const round = event.eventRounds[0]

	if (tournament.id === undefined) {
		throw new Error("Tournament id is required")
	}
	if (!tournament.ggId) {
		throw new Error("Tournament ggId is required")
	}
	if (!round.ggId) {
		throw new Error("Round ggId is required")
	}

	return {
		id: tournament.id,
		name: tournament.name ?? "",
		format: tournament.format,
		isNet: tournament.isNet ? 1 : 0,
		ggId: tournament.ggId,
		eventId: tournament.eventId,
		roundId: tournament.roundId,
		eventGgId: event.ggId ?? null,
		roundGgId: round.ggId,
	}
}

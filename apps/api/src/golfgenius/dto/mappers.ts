import {
	ClubEvent,
	PreparedTournamentPoints,
	PreparedTournamentResult,
	Tournament,
	TournamentData,
} from "@repo/domain/types"

import type { TournamentPointsInsert, TournamentResultInsert } from "../../database"
import type { GgEvent, GgMember, GgRound, GgSeason, GgTournament } from "../api-data"
import { GgCreateMemberDto } from "./golf-genius.dto"
import {
	EventDto,
	MasterRosterItemDto,
	RosterMemberDto,
	RosterMemberSyncDto,
	RoundDto,
	SeasonDto,
	TournamentDto,
} from "./internal.dto"

/**
 * Map raw API master roster item -> MasterRosterItemDto
 */
export function mapMasterRosterItem(member: GgMember): MasterRosterItemDto {
	return {
		member: {
			memberCardId: member.member_card_id,
			handicapNetworkId: member.handicap.handicap_network_id,
			email: member.email,
			firstName: member.first_name,
			lastName: member.last_name,
		},
	}
}

/**
 * Map roster member object from API -> RosterMemberDto
 */
export function mapRosterMember(member: GgMember): RosterMemberDto {
	return {
		id: member.id,
		firstName: member.first_name,
		lastName: member.last_name,
		email: member.email,
		ghin: member.handicap.handicap_network_id,
		externalId: member.external_id ?? undefined,
	}
}

export function mapSeason(season: GgSeason): SeasonDto {
	return {
		id: season.id,
		name: season.name,
		current: season.current,
		archived: season.archived,
	}
}

export function mapEvent(event: GgEvent): EventDto {
	return {
		id: event.id,
		name: event.name,
		ggid: event.ggid,
		startDate: event.start_date,
		endDate: event.end_date,
		website: event.website,
	}
}

export function mapRound(round: GgRound): RoundDto {
	return {
		id: round.id,
		index: round.index,
		date: round.date,
		eventId: round.event_id,
	}
}

export function mapTournament(tournament: GgTournament): TournamentDto {
	let scoreFormat = tournament.score_format

	if (scoreFormat === "stroke") {
		if (tournament.name.toLowerCase().includes("points")) {
			scoreFormat = "points"
		} else if (tournament.score_scope === "pos_group") {
			scoreFormat = "team"
		} else if (tournament.score_scope === "pos_player") {
			scoreFormat = "stroke"
		}
	}

	return {
		id: tournament.id,
		name: tournament.name,
		scoreFormat: scoreFormat,
		handicapFormat: tournament.handicap_format,
	}
}

export function mapMemberExport(member: RosterMemberSyncDto): GgCreateMemberDto {
	return {
		external_id: member.externalId.toString(),
		last_name: member.lastName,
		first_name: member.firstName,
		email: member.email,
		gender: "M",
		handicap_network_id: member.handicapNetworkId,
		rounds: member.rounds,
		custom_fields: member.customFields,
	}
}

/**
 * TODO: this belongs to the events module
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
 * TODO: this belongs to the events module
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

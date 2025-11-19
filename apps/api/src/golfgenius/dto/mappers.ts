import { ClubEvent, IntegrationLogDto, Tournament, TournamentData } from "@repo/domain/types"

import {
	GgCreateMemberDto,
	GgEventDto,
	GgMemberDto,
	GgRoundDto,
	GgSeasonDto,
	GgTournamentDto,
} from "./golf-genius.dto"
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
export function mapMasterRosterItem(member: GgMemberDto): MasterRosterItemDto {
	return {
		member: {
			memberCardId: member?.member_card_id,
			handicapNetworkId: member?.handicap?.handicap_network_id,
			email: member?.email,
			firstName: member?.first_name,
			lastName: member?.last_name,
		},
	}
}

/**
 * Map roster member object from API -> RosterMemberDto
 */
export function mapRosterMember(member: GgMemberDto): RosterMemberDto {
	return {
		id: member.id,
		firstName: member.first_name,
		lastName: member.last_name,
		email: member.email ?? undefined,
		ghin: member.handicap?.handicap_network_id,
		externalId: member.external_id,
	}
}

export function mapSeason(season: GgSeasonDto): SeasonDto {
	return {
		id: season.id,
		name: season.name,
		current: Boolean(season.current),
		archived: Boolean(season.archived),
	}
}

export function mapEvent(event: GgEventDto): EventDto {
	return {
		id: event.id,
		name: event.name,
		ggid: event.ggid,
		startDate: event.start_date,
		endDate: event.end_date,
		website: event.website,
	}
}

export function mapRound(round: GgRoundDto): RoundDto {
	return {
		id: round.id,
		index: round.index,
		date: round.date,
		eventId: round.event_id,
	}
}

export function mapTournament(tournament: GgTournamentDto): TournamentDto {
	if (!tournament.id || !tournament.name) {
		throw new Error(
			`Tournament missing required fields: id=${tournament.id}, name=${tournament.name}`,
		)
	}

	let scoreFormat = tournament.score_format

	if (scoreFormat === "stroke" && tournament.name.toLowerCase().includes("points")) {
		scoreFormat = "points"
	}

	return {
		id: tournament.id,
		name: tournament.name,
		scoreFormat: scoreFormat ?? "",
		handicapFormat: tournament.handicap_format ?? "",
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
 * Map database integration log record to IntegrationLogDto
 */
export function mapToIntegrationLogDto(log: any): IntegrationLogDto {
	return {
		id: log.id,
		actionName: log.actionName,
		actionDate: log.actionDate,
		details: log.details,
		eventId: log.eventId,
		isSuccessful: log.isSuccessful,
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

import {
	AgeRestrictionTypeValue,
	ClubEvent,
	EventFee,
	EventFeeWithType,
	EventStatusValue,
	EventTypeValue,
	FeeRestrictionValue,
	FeeType,
	type PayoutTypeValue,
	type PayoutValue,
	RegistrationTypeValue,
	Round,
	SkinTypeValue,
	StartTypeValue,
	Tournament,
	TournamentFormatValue,
	TournamentPoints,
	TournamentResults,
} from "@repo/domain/types"

import { toPlayer } from "../registration/mappers"
import { toCourse } from "../courses/mappers"
import type {
	EventRow,
	EventFeeRow,
	FeeTypeRow,
	RoundRow,
	TournamentRow,
	TournamentResultRow,
	TournamentPointsRow,
} from "../database"

/**
 * Maps EventRow to ClubEvent domain type
 */
export function toEvent(row: EventRow): ClubEvent {
	return {
		id: row.id,
		eventType: row.eventType as EventTypeValue,
		name: row.name,
		rounds: row.rounds,
		registrationType: row.registrationType as RegistrationTypeValue,
		skinsType: row.skinsType as SkinTypeValue,
		minimumSignupGroupSize: row.minimumSignupGroupSize,
		maximumSignupGroupSize: row.maximumSignupGroupSize,
		groupSize: row.groupSize,
		totalGroups: row.totalGroups,
		startType: row.startType as StartTypeValue,
		canChoose: Boolean(row.canChoose),
		ghinRequired: Boolean(row.ghinRequired),
		seasonPoints: row.seasonPoints,
		notes: row.notes,
		startDate: row.startDate,
		startTime: row.startTime,
		signupStart: row.signupStart,
		signupEnd: row.signupEnd,
		paymentsEnd: row.paymentsEnd,
		registrationMaximum: row.registrationMaximum,
		portalUrl: row.portalUrl,
		externalUrl: row.externalUrl,
		status: row.status as EventStatusValue,
		season: row.season,
		teeTimeSplits: row.teeTimeSplits,
		starterTimeInterval: row.starterTimeInterval,
		teamSize: row.teamSize,
		prioritySignupStart: row.prioritySignupStart,
		signupWaves: row.signupWaves,
		ageRestriction: row.ageRestriction,
		ageRestrictionType: row.ageRestrictionType as AgeRestrictionTypeValue,
		ggId: row.ggId,
	}
}

/**
 * Maps EventRow with loaded compositions to ClubEvent
 */
export function toEventWithCompositions(
	row: EventRow,
	compositions: {
		courses?: ReturnType<typeof toCourse>[]
		eventFees?: EventFee[]
		eventRounds?: Round[]
		tournaments?: Tournament[]
	},
): ClubEvent {
	return {
		...toEvent(row),
		courses: compositions.courses,
		eventFees: compositions.eventFees,
		eventRounds: compositions.eventRounds ?? [],
		tournaments: compositions.tournaments ?? [],
	}
}

/**
 * Maps EventFeeRow to EventFee domain type
 */
export function toEventFee(row: EventFeeRow): EventFee {
	return {
		id: row.id,
		eventId: row.eventId,
		amount: parseFloat(row.amount),
		isRequired: Boolean(row.isRequired),
		displayOrder: row.displayOrder,
		feeTypeId: row.feeTypeId,
		overrideAmount: row.overrideAmount ? parseFloat(row.overrideAmount) : undefined,
		overrideRestriction: row.overrideRestriction as FeeRestrictionValue,
	}
}

/**
 * Maps EventFeeRow with FeeTypeRow to EventFeeWithType (with required feeType)
 */
export function toEventFeeWithType(row: {
	eventFee: EventFeeRow
	feeType: FeeTypeRow
}): EventFeeWithType {
	return {
		...toEventFee(row.eventFee),
		feeType: toFeeType(row.feeType),
	}
}

/**
 * Maps FeeTypeRow to FeeType domain type
 */
export function toFeeType(row: FeeTypeRow): FeeType {
	return {
		id: row.id,
		name: row.name,
		code: row.code,
		payout: row.payout as PayoutTypeValue,
		restriction: row.restriction as FeeRestrictionValue,
	}
}

/**
 * Maps RoundRow to Round domain type
 */
export function toRound(row: RoundRow): Round {
	return {
		id: row.id,
		eventId: row.eventId,
		roundNumber: row.roundNumber,
		roundDate: row.roundDate,
		ggId: row.ggId,
	}
}

/**
 * Maps TournamentRow to Tournament domain type
 */
export function toTournament(row: TournamentRow): Tournament {
	return {
		id: row.id,
		eventId: row.eventId,
		roundId: row.roundId,
		name: row.name,
		format: row.format as TournamentFormatValue,
		isNet: Boolean(row.isNet),
		ggId: row.ggId,
	}
}

/**
 * Maps TournamentResultRow to TournamentResults domain type
 */
export function toTournamentResults(
	row: TournamentResultRow,
	player?: ReturnType<typeof toPlayer>,
): TournamentResults {
	return {
		id: row.id,
		tournamentId: row.tournamentId,
		flight: row.flight ?? undefined,
		playerId: row.playerId,
		teamId: row.teamId ?? undefined,
		position: row.position,
		score: row.score ?? undefined,
		amount: parseFloat(row.amount),
		payoutType: row.payoutType as PayoutTypeValue,
		payoutTo: row.payoutTo as PayoutValue,
		player,
	}
}

/**
 * Maps TournamentPointsRow to TournamentPoints domain type
 */
export function toTournamentPoints(
	row: TournamentPointsRow,
	player?: ReturnType<typeof toPlayer>,
): TournamentPoints {
	return {
		id: row.id,
		tournamentId: row.tournamentId,
		playerId: row.playerId,
		position: row.position,
		score: row.score ?? undefined,
		points: row.points,
		details: row.details ?? undefined,
		createDate: row.createDate,
		player,
	}
}

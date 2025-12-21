import {
	AgeRestrictionTypeValue,
	ClubEvent,
	EventFee,
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
	TournamentResults,
} from "@repo/domain/types"

import { toPlayer } from "../registration/mappers"

import { toCourse } from "../courses/mappers"
import type {
	EventFeeModel,
	EventModel,
	FeeTypeModel,
	RoundModel,
	TournamentModel,
	TournamentPointsModel,
	TournamentResultModel,
} from "../database/models"

/**
 * Maps database entity to EventModel
 */
export function mapToEventModel(entity: Record<string, any>): EventModel {
	return {
		id: entity.id,
		eventType: entity.eventType,
		name: entity.name,
		rounds: entity.rounds,
		registrationType: entity.registrationType,
		skinsType: entity.skinsType,
		minimumSignupGroupSize: entity.minimumSignupGroupSize,
		maximumSignupGroupSize: entity.maximumSignupGroupSize,
		groupSize: entity.groupSize,
		totalGroups: entity.totalGroups,
		startType: entity.startType,
		canChoose: entity.canChoose ? 1 : 0,
		ghinRequired: entity.ghinRequired ? 1 : 0,
		seasonPoints: entity.seasonPoints,
		notes: entity.notes,
		startDate: entity.startDate,
		startTime: entity.startTime,
		signupStart: entity.signupStart,
		signupEnd: entity.signupEnd,
		paymentsEnd: entity.paymentsEnd,
		registrationMaximum: entity.registrationMaximum,
		portalUrl: entity.portalUrl,
		externalUrl: entity.externalUrl,
		status: entity.status,
		season: entity.season,
		teeTimeSplits: entity.teeTimeSplits,
		starterTimeInterval: entity.starterTimeInterval,
		teamSize: entity.teamSize,
		prioritySignupStart: entity.prioritySignupStart,
		ageRestriction: entity.ageRestriction,
		ageRestrictionType: entity.ageRestrictionType,
		ggId: entity.ggId,
		// Optional, not included in simple mappers
	}
}

/**
 * Maps database entity to EventFeeModel
 */
export function mapToEventFeeModel(entity: Record<string, any>): EventFeeModel {
	return {
		id: entity.id,
		amount: entity.amount,
		isRequired: entity.isRequired,
		displayOrder: entity.displayOrder,
		eventId: entity.eventId,
		feeTypeId: entity.feeTypeId,
		overrideAmount: entity.overrideAmount,
		overrideRestriction: entity.overrideRestriction,
	}
}

/**
 * Maps database entity to FeeTypeModel
 */
export function mapToFeeTypeModel(entity: Record<string, any>): FeeTypeModel {
	return {
		id: entity.id,
		name: entity.name,
		code: entity.code,
		payout: entity.payout,
		restriction: entity.restriction,
	}
}

/**
 * Maps database entity to RoundModel
 */
export function mapToRoundModel(entity: Record<string, any>): RoundModel {
	return {
		id: entity.id,
		eventId: entity.eventId,
		roundNumber: entity.roundNumber,
		roundDate: entity.roundDate,
		ggId: entity.ggId,
		tournaments: undefined, // Optional
	}
}

/**
 * Maps database entity to TournamentModel
 */
export function mapToTournamentModel(entity: Record<string, any>): TournamentModel {
	return {
		id: entity.id,
		eventId: entity.eventId,
		roundId: entity.roundId,
		name: entity.name,
		format: entity.format,
		isNet: entity.isNet,
		ggId: entity.ggId,
	}
}

/**
 * Maps database entity to TournamentResultModel
 */
export function mapToTournamentResultModel(entity: Record<string, any>): TournamentResultModel {
	return {
		id: entity.id,
		flight: entity.flight,
		position: entity.position,
		score: entity.score,
		amount: entity.amount,
		details: entity.details,
		playerId: entity.playerId,
		tournamentId: entity.tournamentId,
		teamId: entity.teamId,
		createDate: entity.createDate,
		payoutDate: entity.payoutDate,
		payoutStatus: entity.payoutStatus,
		payoutTo: entity.payoutTo,
		payoutType: entity.payoutType,
		summary: entity.summary,
	}
}

/**
 * Maps database entity to TournamentPointsModel
 */
export function mapToTournamentPointsModel(entity: Record<string, any>): TournamentPointsModel {
	return {
		id: entity.id,
		position: entity.position,
		score: entity.score,
		points: entity.points,
		createDate: entity.createDate,
		details: entity.details,
		tournamentId: entity.tournamentId,
		playerId: entity.playerId,
	}
}

// Domain mappers from Model to Domain

/**
 * Maps EventModel to ClubEvent domain class
 */
export function toEvent(model: EventModel): ClubEvent {
	return {
		id: model.id!,
		eventType: model.eventType as EventTypeValue,
		name: model.name,
		rounds: model.rounds,
		registrationType: model.registrationType as RegistrationTypeValue,
		skinsType: model.skinsType as SkinTypeValue,
		minimumSignupGroupSize: model.minimumSignupGroupSize,
		maximumSignupGroupSize: model.maximumSignupGroupSize,
		groupSize: model.groupSize,
		totalGroups: model.totalGroups,
		startType: model.startType as StartTypeValue,
		canChoose: Boolean(model.canChoose),
		ghinRequired: Boolean(model.ghinRequired),
		seasonPoints: model.seasonPoints,
		notes: model.notes,
		startDate: model.startDate,
		startTime: model.startTime,
		signupStart: model.signupStart,
		signupEnd: model.signupEnd,
		paymentsEnd: model.paymentsEnd,
		registrationMaximum: model.registrationMaximum,
		portalUrl: model.portalUrl,
		externalUrl: model.externalUrl,
		status: model.status,
		season: model.season,
		teeTimeSplits: model.teeTimeSplits,
		starterTimeInterval: model.starterTimeInterval,
		teamSize: model.teamSize,
		prioritySignupStart: model.prioritySignupStart,
		ageRestriction: model.ageRestriction,
		ageRestrictionType: model.ageRestrictionType as AgeRestrictionTypeValue,
		ggId: model.ggId,
		courses: model.courses?.map(toCourse),
		eventFees: model.eventFees?.map(toEventFee),
		eventRounds: model.eventRounds?.map(toRound) || [],
		tournaments: model.tournaments?.map(toTournament) || [],
	}
}

/**
 * Maps EventFeeModel to EventFee domain class
 */
export function toEventFee(model: EventFeeModel): EventFee {
	return {
		id: model.id,
		eventId: model.eventId,
		amount: model.amount,
		isRequired: Boolean(model.isRequired),
		displayOrder: model.displayOrder,
		feeTypeId: model.feeTypeId,
		overrideAmount: model.overrideAmount,
		overrideRestriction: model.overrideRestriction as FeeRestrictionValue,
		feeType: model.feeType ? toFeeType(model.feeType) : undefined,
	}
}

/**
 * Maps FeeTypeModel to FeeType domain class
 */
export function toFeeType(model: FeeTypeModel): FeeType {
	return {
		id: model.id,
		name: model.name,
		code: model.code,
		payout: model.payout as PayoutTypeValue,
		restriction: model.restriction as FeeRestrictionValue,
	}
}

/**
 * Maps RoundModel to Round domain class
 */
export function toRound(model: RoundModel): Round {
	return {
		id: model.id!,
		eventId: model.eventId,
		roundNumber: model.roundNumber,
		roundDate: model.roundDate,
		ggId: model.ggId,
	}
}

/**
 * Maps TournamentModel to Tournament domain class
 */
export function toTournament(model: TournamentModel): Tournament {
	return {
		id: model.id!,
		eventId: model.eventId,
		roundId: model.roundId,
		name: model.name,
		format: model.format,
		isNet: Boolean(model.isNet),
		ggId: model.ggId,
	}
}

/**
 * Maps TournamentResultModel to TournamentResults domain class
 */
export function toTournamentResults(model: TournamentResultModel): TournamentResults {
	return {
		id: model.id!,
		tournamentId: model.tournamentId,
		flight: model.flight,
		playerId: model.playerId,
		teamId: model.teamId,
		position: model.position,
		score: model.score,
		amount: parseFloat(model.amount),
		payoutType: model.payoutType as PayoutTypeValue,
		payoutTo: model.payoutTo as PayoutValue,
		player: model.player ? toPlayer(model.player) : undefined,
	}
}

import { EventDto, EventFeeDto, FeeTypeDto } from "@repo/dto"

import { RoundDto } from "./round.dto"
import { TournamentDto } from "./tournament.dto"

/**
 * Maps database entity to EventDto
 */
export function mapToEventDto(entity: Record<string, any>): EventDto {
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
		canChoose: Boolean(entity.canChoose),
		ghinRequired: Boolean(entity.ghinRequired),
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
	}
}

/**
 * Maps EventDto to database entity for insert/update
 */
export function mapEventDtoToEntity(dto: EventDto): Record<string, any> {
	return {
		eventType: dto.eventType,
		name: dto.name,
		rounds: dto.rounds,
		registrationType: dto.registrationType,
		skinsType: dto.skinsType,
		minimumSignupGroupSize: dto.minimumSignupGroupSize,
		maximumSignupGroupSize: dto.maximumSignupGroupSize,
		groupSize: dto.groupSize,
		totalGroups: dto.totalGroups,
		startType: dto.startType,
		canChoose: dto.canChoose ? 1 : 0,
		ghinRequired: dto.ghinRequired ? 1 : 0,
		seasonPoints: dto.seasonPoints,
		notes: dto.notes,
		startDate: dto.startDate,
		startTime: dto.startTime,
		signupStart: dto.signupStart,
		signupEnd: dto.signupEnd,
		paymentsEnd: dto.paymentsEnd,
		registrationMaximum: dto.registrationMaximum,
		portalUrl: dto.portalUrl,
		externalUrl: dto.externalUrl,
		status: dto.status,
		season: dto.season,
		teeTimeSplits: dto.teeTimeSplits,
		starterTimeInterval: dto.starterTimeInterval,
		teamSize: dto.teamSize,
		prioritySignupStart: dto.prioritySignupStart,
		ageRestriction: dto.ageRestriction,
		ageRestrictionType: dto.ageRestrictionType,
		ggId: dto.ggId,
	}
}

/**
 * Maps database entity to EventFeeDto
 */
export function mapToEventFeeDto(entity: Record<string, any>): EventFeeDto {
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
 * Maps database entity to FeeTypeDto
 */
export function mapToFeeTypeDto(entity: Record<string, any>): FeeTypeDto {
	return {
		id: entity.id,
		name: entity.name,
		code: entity.code,
		payout: entity.payout,
		restriction: entity.restriction,
	}
}

/**
 * Maps EventFeeDto to database entity for insert/update
 */
export function mapEventFeeDtoToEntity(dto: EventFeeDto): Record<string, any> {
	return {
		amount: dto.amount,
		isRequired: dto.isRequired,
		displayOrder: dto.displayOrder,
		eventId: dto.eventId,
		feeTypeId: dto.feeTypeId,
		overrideAmount: dto.overrideAmount,
		overrideRestriction: dto.overrideRestriction,
	}
}

/**
 * Maps database entity to RoundDto
 */
export function mapToRoundDto(entity: Record<string, any>): RoundDto {
	return {
		id: entity.id,
		eventId: entity.eventId,
		roundNumber: entity.roundNumber,
		roundDate: entity.roundDate,
		ggId: entity.ggId,
	}
}

/**
 * Maps RoundDto to database entity for insert/update
 */
export function mapRoundDtoToEntity(dto: RoundDto): Record<string, any> {
	return {
		eventId: dto.eventId,
		roundNumber: dto.roundNumber,
		roundDate: dto.roundDate,
		ggId: dto.ggId,
	}
}

/**
 * Maps database entity to TournamentDto
 */
export function mapToTournamentDto(entity: Record<string, any>): TournamentDto {
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
 * Maps TournamentDto to database entity for insert/update
 */
export function mapTournamentDtoToEntity(dto: TournamentDto): Record<string, any> {
	return {
		eventId: dto.eventId,
		roundId: dto.roundId,
		name: dto.name,
		format: dto.format,
		isNet: dto.isNet,
		ggId: dto.ggId,
	}
}

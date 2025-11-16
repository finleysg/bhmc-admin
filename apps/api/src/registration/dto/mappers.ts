import { PlayerDto } from "@repo/dto"

import { CourseDto, RegisteredPlayerDto, RegistrationFeeDto } from "./registered-player.dto"
import { RegistrationSlotDto } from "./registration-slot.dto"
import { RegistrationDto } from "./registration.dto"

/**
 * Maps database entity to PlayerDto
 */
export function mapToPlayerDto(entity: Record<string, any>): PlayerDto {
	return {
		id: entity.id,
		firstName: entity.firstName,
		lastName: entity.lastName,
		email: entity.email,
		phoneNumber: entity.phoneNumber,
		ghin: entity.ghin,
		tee: entity.tee,
		birthDate: entity.birthDate,
		isMember: !!entity.isMember,
		userId: entity.userId,
		ggId: entity.ggId,
	}
}

/**
 * Maps PlayerDto to database entity for insert/update
 */
export function mapPlayerDtoToEntity(dto: PlayerDto): Record<string, any> {
	return {
		firstName: dto.firstName,
		lastName: dto.lastName,
		email: dto.email,
		phoneNumber: dto.phoneNumber,
		ghin: dto.ghin,
		tee: dto.tee,
		birthDate: dto.birthDate,
		isMember: dto.isMember ? 1 : 0,
		ggId: dto.ggId,
	}
}

/**
 * Maps database entity to RegistrationSlotDto
 */
export function mapToRegistrationSlotDto(entity: Record<string, any>): RegistrationSlotDto {
	return {
		id: entity.id,
		startingOrder: entity.startingOrder,
		slot: entity.slot,
		status: entity.status,
		eventId: entity.eventId,
		holeId: entity.holeId,
		playerId: entity.playerId,
		registrationId: entity.registrationId,
		ggId: entity.ggId,
	}
}

/**
 * Maps RegistrationSlotDto to database entity for insert/update
 */
export function mapRegistrationSlotDtoToEntity(dto: RegistrationSlotDto): Record<string, any> {
	return {
		startingOrder: dto.startingOrder,
		slot: dto.slot,
		status: dto.status,
		eventId: dto.eventId,
		holeId: dto.holeId,
		playerId: dto.playerId,
		registrationId: dto.registrationId,
		ggId: dto.ggId,
	}
}

/**
 * Maps database entity to RegistrationDto
 */
export function mapToRegistrationDto(entity: Record<string, any>): RegistrationDto {
	return {
		id: entity.id,
		expires: entity.expires,
		startingHole: entity.startingHole,
		startingOrder: entity.startingOrder,
		notes: entity.notes,
		courseId: entity.courseId,
		eventId: entity.eventId,
		signedUpBy: entity.signedUpBy,
		userId: entity.userId,
		createdDate: entity.createdDate,
		ggId: entity.ggId,
	}
}

/**
 * Maps RegistrationDto to database entity for insert/update
 */
export function mapRegistrationDtoToEntity(dto: RegistrationDto): Record<string, any> {
	return {
		expires: dto.expires,
		startingHole: dto.startingHole,
		startingOrder: dto.startingOrder,
		notes: dto.notes,
		courseId: dto.courseId,
		eventId: dto.eventId,
		signedUpBy: dto.signedUpBy,
		userId: dto.userId,
		createdDate: dto.createdDate,
		ggId: dto.ggId,
	}
}

/**
 * Maps database entity to CourseDto
 */
export function mapToCourseDto(entity: Record<string, any>): CourseDto {
	return {
		id: entity.id,
		name: entity.name,
		numberOfHoles: entity.numberOfHoles,
		ggId: entity.ggId,
	}
}

/**
 * Maps database entity to RegistrationFeeDto
 */
export function mapToRegistrationFeeDto(entity: Record<string, any>): RegistrationFeeDto {
	return {
		id: entity.fee?.id,
		isPaid: entity.fee?.isPaid,
		eventFeeId: entity.fee?.eventFeeId,
		paymentId: entity.fee?.paymentId,
		registrationSlotId: entity.fee?.registrationSlotId,
		amount: entity.fee?.amount,
		// fee: entity.fee,
		eventFee: entity.eventFee,
		feeType: entity.feeType,
	}
}

/**
 * Maps database entity to RegisteredPlayerDto
 */
export function mapToRegisteredPlayerDto(entity: Record<string, any>): RegisteredPlayerDto {
	return {
		slot: mapToRegistrationSlotDto(entity.slot),
		player: entity.player ? mapToPlayerDto(entity.player) : undefined,
		registration: entity.registration ? mapToRegistrationDto(entity.registration) : undefined,
		course: entity.course ? mapToCourseDto(entity.course) : undefined,
		fees: entity.fees || [],
	}
}

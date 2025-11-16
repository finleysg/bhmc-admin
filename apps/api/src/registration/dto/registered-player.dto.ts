import { PlayerDto } from "./player.dto"
import { RegistrationSlotDto } from "./registration-slot.dto"
import { RegistrationDto } from "./registration.dto"

export interface CourseDto {
	id?: number
	name: string
	numberOfHoles: number
	ggId?: string | null
}

export interface FeeTypeDto {
	id?: number
	name: string
	description?: string | null
}

export interface EventFeeDto {
	id?: number
	amount: string
	isRequired: number
	displayOrder: number
	eventId: number
	feeTypeId: number
	overrideAmount?: string | null
	overrideRestriction?: string | null
}

export interface RegistrationFeeDto {
	id?: number
	isPaid: number
	eventFeeId: number
	paymentId: number
	registrationSlotId?: number | null
	amount: string
	// fee?: RegistrationFeeDto
	eventFee?: EventFeeDto
	feeType?: FeeTypeDto
}

export interface RegisteredPlayerDto {
	slot: RegistrationSlotDto
	player?: PlayerDto
	registration?: RegistrationDto
	course?: CourseDto
	fees?: RegistrationFeeDto[]
}

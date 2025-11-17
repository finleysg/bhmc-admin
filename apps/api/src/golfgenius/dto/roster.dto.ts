/**
 * Types for roster player transformation in Golf Genius integration
 */

import { CourseDto, EventDto, EventFeeDto, FeeTypeDto, HoleDto } from "@repo/dto"

import { RoundDto } from "../../events"
import { RegisteredPlayerDto } from "../../registration"

export interface FeeDefinition {
	eventFee?: EventFeeDto
	feeType: FeeTypeDto
	name: string
}

export interface TransformationContext {
	event: EventDto
	rounds: RoundDto[]
	course?: CourseDto
	holes: HoleDto[]
	eventFees: EventFeeDto[]
	allSlotsInRegistration: RegisteredPlayerDto[]
}

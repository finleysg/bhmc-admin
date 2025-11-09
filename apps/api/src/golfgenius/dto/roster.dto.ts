/**
 * Types for roster player transformation in Golf Genius integration
 */

import { CourseDto, HoleDto } from "../../courses"
import { EventDto, EventFeeDto, FeeTypeDto, RoundDto } from "../../events"
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
	feeDefinitions: FeeDefinition[]
	allSlotsInRegistration: RegisteredPlayerDto[]
}

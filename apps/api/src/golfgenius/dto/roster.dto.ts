/**
 * Types for roster player transformation in Golf Genius integration
 */

import { CourseDto } from "../../courses/dto/course.dto"
import { HoleDto } from "../../courses/dto/hole.dto"
import { EventFeeDto, FeeTypeDto } from "../../events/dto/event-fee.dto"
import { EventDto } from "../../events/dto/event.dto"
import { RoundDto } from "../../events/dto/round.dto"
import { RegisteredPlayerDto } from "../../registration/dto/registered-player.dto"

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

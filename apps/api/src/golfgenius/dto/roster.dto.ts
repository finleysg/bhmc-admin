/**
 * Types for roster player transformation in Golf Genius integration
 */

import { Course, ValidatedClubEvent, ValidatedRegisteredPlayer } from "@repo/domain/types"

export interface TransformationContext {
	event: ValidatedClubEvent
	group: ValidatedRegisteredPlayer[]
	course?: Course
}

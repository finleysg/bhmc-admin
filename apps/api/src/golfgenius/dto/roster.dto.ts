/**
 * Types for roster player transformation in Golf Genius integration
 */

import { Course, Hole, RegisteredPlayer, ValidatedClubEvent } from "@repo/domain/types"

// TODO: these should all be pre-validated
export interface TransformationContext {
	event: ValidatedClubEvent
	course?: Course
	holes: Hole[]
	group: RegisteredPlayer[]
}

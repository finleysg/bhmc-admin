/**
 * Types for roster player transformation in Golf Genius integration
 */

import { CompleteClubEvent, Course, Hole, RegisteredPlayer } from "@repo/domain/types"

export interface TransformationContext {
	event: CompleteClubEvent
	course?: Course
	holes: Hole[]
	group: RegisteredPlayer[]
}

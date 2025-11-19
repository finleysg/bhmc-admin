/**
 * Types for roster player transformation in Golf Genius integration
 */

import { ClubEvent, Course, Hole, RegisteredPlayer } from "@repo/domain/types"

export interface TransformationContext {
	event: ClubEvent
	course?: Course
	holes: Hole[]
	group: RegisteredPlayer[]
}

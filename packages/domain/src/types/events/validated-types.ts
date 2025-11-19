// Type intersections ensuring required fields for validated objects in CompleteClubEvent

import { Course } from "../courses/course"
import { Hole } from "../courses/hole"
import { Tee } from "../courses/tee"
// Consolidated ValidatedClubEvent type with all guaranteed fields and sub-object validations
import { ClubEvent } from "./event"
import { EventFee, FeeType } from "./event-fee"
import { Round } from "./round"
import { Tournament } from "./tournament"

export type ValidatedFeeType = FeeType & { id: number }

export type ValidatedEventFee = EventFee & { id: number; feeType: ValidatedFeeType }

export type ValidatedHole = Hole & { id: number }

export type ValidatedTee = Tee & { id: number }

export type ValidatedCourse = Course & {
	id: number
	holes: ValidatedHole[]
	tees: ValidatedTee[]
}

export type ValidatedRound = Round & { id: number; ggId: string }

export type ValidatedTournament = Tournament & { id: number; ggId: string }

/**
 * A validated variation of ClubEvent where all fields and nested ids are guaranteed to be present.
 * Used when validateClubEvent passes full validation.
 */
export type ValidatedClubEvent = Omit<
	ClubEvent,
	"ggId" | "eventRounds" | "tournaments" | "eventFees" | "courses"
> & {
	ggId: string
	eventRounds: ValidatedRound[]
	tournaments: ValidatedTournament[]
	eventFees: ValidatedEventFee[]
	courses?: ValidatedCourse[]
}

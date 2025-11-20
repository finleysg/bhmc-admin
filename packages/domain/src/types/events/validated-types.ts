// Type intersections ensuring required fields for validated objects in CompleteClubEvent

import { ValidatedCourse } from "../courses/validated-types"
// Consolidated ValidatedClubEvent type with all guaranteed fields and sub-object validations
import { ClubEvent } from "./event"
import { EventFee, FeeType } from "./event-fee"
import { Round } from "./round"
import { Tournament } from "./tournament"

export type ValidatedFeeType = FeeType & { id: number }

export type ValidatedEventFee = EventFee & { id: number; feeType: ValidatedFeeType }

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

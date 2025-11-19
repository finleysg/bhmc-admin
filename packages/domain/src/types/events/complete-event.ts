import { Course } from "../courses/course"
import { ClubEvent } from "./event"
import { EventFee } from "./event-fee"
import { Round } from "./round"
import { Tournament } from "./tournament"

/**
 * A validated variation of ClubEvent where GolfGenius-related fields are guaranteed to be present.
 * Used when validateClubEvent passes default validation (excludeGolfGenius = false).
 */
export type CompleteClubEvent = Omit<
	ClubEvent,
	"ggId" | "eventRounds" | "tournaments" | "eventFees" | "courses"
> & {
	ggId: string
	eventRounds: Round[]
	tournaments: Tournament[]
	eventFees: EventFee[]
	courses?: Course[]
}

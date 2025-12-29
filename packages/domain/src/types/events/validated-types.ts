import { CompleteCourse } from "../courses/validated-types"
import { Player } from "../register/player"
import { PayoutTypeValue, PayoutValue } from "./choices"
import { ClubEvent } from "./event"
import { EventFee, FeeType } from "./event-fee"
import { Round } from "./round"
import { Tournament } from "./tournament"
import { TournamentResults } from "./tournament-results"

export type EventFeeWithType = Omit<EventFee, "feeType"> & { feeType: FeeType }
export type CompleteTournamentResults = Omit<
	TournamentResults,
	"player" | "payoutType" | "payoutTo"
> & {
	player: Player
	payoutType: PayoutTypeValue
	payoutTo: PayoutValue
}
export type CompleteTournamentPoints = Omit<TournamentResults, "player"> & { player: Player }

/**
 * A validated variation of ClubEvent where all fields and nested ids are guaranteed to be present.
 * Used when validateClubEvent passes full validation.
 */
export type CompleteClubEvent = Omit<
	ClubEvent,
	"ggId" | "eventRounds" | "tournaments" | "eventFees" | "courses"
> & {
	ggId: string
	eventRounds: Round[]
	tournaments: Tournament[]
	eventFees: EventFeeWithType[]
	courses?: CompleteCourse[]
}

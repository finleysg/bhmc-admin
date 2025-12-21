import { ValidatedCourse } from "../courses/validated-types"
import { Player } from "../register/player"
import { PayoutTypeValue, PayoutValue } from "./choices"
import { ClubEvent } from "./event"
import { EventFee, FeeType } from "./event-fee"
import { Round } from "./round"
import { Tournament } from "./tournament"
import { TournamentResults } from "./tournament-results"

export type ValidatedEventFee = Omit<EventFee, "feeType"> & { feeType: FeeType }
export type ValidatedTournamentResults = Omit<
	TournamentResults,
	"player" | "payoutType" | "payoutTo"
> & {
	player: Player
	payoutType: PayoutTypeValue
	payoutTo: PayoutValue
}
export type ValidatedTournamentPoints = Omit<TournamentResults, "player"> & { player: Player }

/**
 * A validated variation of ClubEvent where all fields and nested ids are guaranteed to be present.
 * Used when validateClubEvent passes full validation.
 */
export type ValidatedClubEvent = Omit<
	ClubEvent,
	"ggId" | "eventRounds" | "tournaments" | "eventFees" | "courses"
> & {
	ggId: string
	eventRounds: Round[]
	tournaments: Tournament[]
	eventFees: ValidatedEventFee[]
	courses?: ValidatedCourse[]
}

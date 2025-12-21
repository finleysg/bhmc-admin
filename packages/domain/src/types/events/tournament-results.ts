import { Player } from "../register/player"
import type { PayoutTypeValue, PayoutValue } from "./choices"

export interface TournamentResults {
	id: number
	tournamentId: number
	flight?: string
	playerId: number
	teamId?: string
	position: number
	score?: number
	amount: number
	payoutType?: PayoutTypeValue
	payoutTo?: PayoutValue
	player?: Player
}

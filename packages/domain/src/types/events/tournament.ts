import type { TournamentFormatValue } from "./choices"

export interface Tournament {
	id: number
	eventId: number
	roundId: number
	name: string
	format: TournamentFormatValue
	isNet: boolean
	ggId: string
}

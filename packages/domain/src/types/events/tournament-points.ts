import { Player } from "../register/player"

export interface TournamentPoints {
	id: number
	tournamentId: number
	playerId: number
	position: number
	score?: number
	points: number
	details?: string
	createDate: string
	player?: Player
}

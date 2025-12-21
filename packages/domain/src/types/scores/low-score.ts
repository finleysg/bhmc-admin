import { Player } from "../register/player"

export interface LowScore {
	id: number
	season: number
	courseName: string
	score: number
	playerId: number
	isNet: boolean
	player?: Player
}

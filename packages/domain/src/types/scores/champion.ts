import { Player } from "../register/player"

export interface Champion {
	id: number
	season: number
	eventName: string
	flight: string
	score: number
	playerId: number
	isNet: boolean
	eventId?: number
	teamId?: string
	player?: Player
}

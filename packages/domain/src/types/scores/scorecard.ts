import { Score } from "./score"

export interface Scorecard {
	id: number
	handicapIndex: string | null
	courseHandicap: number
	courseId: number
	eventId: number
	playerId: number
	teeId: number
	scores?: Score[]
}

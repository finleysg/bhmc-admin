import { ScoreDto } from "./score.dto"

export interface ScorecardDto {
	id?: number
	handicapIndex: string
	courseHandicap: number
	courseId: number
	eventId: number
	playerId: number
	teeId: number
	scores?: ScoreDto[]
}

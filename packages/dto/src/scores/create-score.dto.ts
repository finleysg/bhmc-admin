export class CreateScoreDto {
	score!: number
	isNet?: number
	eventId?: number // Legacy field
	holeId!: number
	playerId?: number // Legacy field
	courseId?: number // Legacy field
	teeId?: number // Legacy field
	scorecardId?: number
}

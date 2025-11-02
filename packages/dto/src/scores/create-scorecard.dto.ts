export class CreateScorecardDto {
	handicapIndex?: string | null
	courseHandicap!: number
	courseId?: number | null
	eventId!: number
	playerId!: number
	teeId?: number | null
}

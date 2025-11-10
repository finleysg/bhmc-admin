/**
 * DTO representing a prepared tournament result record for batch insertion.
 * Used in Golf Genius integration operations.
 */
export interface PreparedTournamentPoints {
	tournamentId: number
	playerId: number
	position: number
	score: number | null
	points: number
	details: string | null
	createDate: string
}

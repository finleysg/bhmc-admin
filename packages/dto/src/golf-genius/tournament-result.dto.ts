/**
 * DTO representing a prepared tournament result record for batch insertion.
 * Used in Golf Genius integration operations.
 */
export interface PreparedTournamentResult {
	tournamentId: number
	playerId: number
	flight: string | null
	position: number
	score: number | null
	amount: string
	summary: string | null
	details: string | null
	createDate: string
	payoutDate: string | null
	payoutStatus: string | null
	payoutTo: string | null
	payoutType: string | null
	teamId: string | null
}

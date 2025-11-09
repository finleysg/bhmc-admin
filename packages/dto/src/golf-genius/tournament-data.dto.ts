/**
 * DTO representing tournament data needed for Golf Genius integration operations.
 * This includes tournament details with associated event and round Golf Genius IDs.
 */
export interface TournamentData {
	id: number
	name: string
	format: string | null
	isNet: number
	ggId: string
	eventId: number
	roundId: number
	eventGgId: string | null
	roundGgId: string
}

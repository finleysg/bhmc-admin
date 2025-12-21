export interface PlayerProgressEvent {
	totalPlayers: number
	processedPlayers: number
	status?: "processing" | "complete" | "error"
	message?: string
}

export interface TournamentProgressEvent {
	totalTournaments: number
	processedTournaments: number
	status?: "processing" | "complete" | "error"
	message?: string
}

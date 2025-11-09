export interface ProgressTournamentDto {
	totalTournaments: number
	processedTournaments: number
	status?: "processing" | "complete" | "error"
	message?: string
}

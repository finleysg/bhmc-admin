export interface ProgressEventDto {
	totalPlayers: number
	processedPlayers: number
	status?: "processing" | "complete" | "error"
	message?: string
}

export interface PointsReportRowDto {
	tournamentName: string
	position: number
	fullName: string
	ghin: string
	score: number | null
	points: number
	type: "Gross" | "Net"
	details: string | null
}

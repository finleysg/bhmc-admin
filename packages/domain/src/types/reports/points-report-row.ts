export interface PointsReportRow {
	tournamentName: string
	position: number
	fullName: string
	ghin: string
	handicapIndex: number | null
	score: number | null
	points: number
	type: "Gross" | "Net"
	details: string | null
}

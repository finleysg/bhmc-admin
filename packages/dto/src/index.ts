export type TournamentDTO = {
	id: string
	name: string
	startDate: string // ISO date
	endDate?: string // ISO date
	location?: string
}

export type PlayerDTO = {
	id: string
	firstName: string
	lastName: string
	email?: string
	handicap?: number
}

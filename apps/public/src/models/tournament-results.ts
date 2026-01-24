import { z } from "zod"

// TournamentResult API Schema
export const TournamentResultApiSchema = z.object({
	id: z.number(),
	tournament: z.number(),
	player: z.number(),
	team_id: z.string().nullable(),
	position: z.number(),
	score: z.number().nullable(),
	amount: z.string(), // DecimalField comes as string from API
	payout_type: z.string().nullable(),
	payout_to: z.string().nullable(),
	payout_status: z.string().nullable(),
	flight: z.string().nullable(),
	summary: z.string().nullable(),
	details: z.string().nullable(),
	event_name: z.string(),
	event_date: z.string(),
})

export type TournamentResultData = z.infer<typeof TournamentResultApiSchema>

export class TournamentResult {
	id: number
	tournamentId: number
	playerId: number
	teamId: string | null
	position: number
	score: number | null
	amount: number
	payoutType: string | null
	payoutTo: string | null
	payoutStatus: string | null
	flight: string | null
	summary: string | null
	details: string | null
	eventName: string
	eventDate: Date

	constructor(data: TournamentResultData) {
		this.id = data.id
		this.tournamentId = data.tournament
		this.playerId = data.player
		this.teamId = data.team_id
		this.position = data.position
		this.score = data.score
		this.amount = parseFloat(data.amount)
		this.payoutType = data.payout_type
		this.payoutTo = data.payout_to
		this.payoutStatus = data.payout_status
		this.flight = data.flight
		this.summary = data.summary
		this.details = data.details
		this.eventName = data.event_name
		this.eventDate = new Date(data.event_date)
	}
}

// TournamentPoints API Schema
export const TournamentPointsApiSchema = z.object({
	id: z.number(),
	tournament: z.number(),
	player: z.number(),
	position: z.number(),
	score: z.number().nullable(),
	points: z.number(),
	details: z.string().nullable(),
	create_date: z.string(),
	event_name: z.string(),
	event_date: z.string(),
})

export type TournamentPointsData = z.infer<typeof TournamentPointsApiSchema>

export class TournamentPoints {
	id: number
	tournamentId: number
	playerId: number
	position: number
	score: number | null
	points: number
	details: string | null
	createDate: Date
	eventName: string
	eventDate: Date

	constructor(data: TournamentPointsData) {
		this.id = data.id
		this.tournamentId = data.tournament
		this.playerId = data.player
		this.position = data.position
		this.score = data.score
		this.points = data.points
		this.details = data.details
		this.createDate = new Date(data.create_date)
		this.eventName = data.event_name
		this.eventDate = new Date(data.event_date)
	}
}

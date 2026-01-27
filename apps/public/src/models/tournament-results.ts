import { z } from "zod"

// Nested tournament schema (shared by both APIs)
const TournamentNestedSchema = z.object({
	id: z.number(),
	event: z.number(),
	round: z.number().nullable(),
	name: z.string(),
	format: z.string().nullable(),
	is_net: z.boolean(),
	gg_id: z.string().nullable(),
})

// TournamentResult API Schema
export const TournamentResultApiSchema = z.object({
	id: z.number(),
	tournament: TournamentNestedSchema,
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
})

export type TournamentResultData = z.infer<typeof TournamentResultApiSchema>

export class TournamentResult {
	id: number
	tournamentId: number
	eventId: number
	tournamentName: string
	isNet: boolean
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

	constructor(data: TournamentResultData) {
		this.id = data.id
		this.tournamentId = data.tournament.id
		this.eventId = data.tournament.event
		this.tournamentName = data.tournament.name
		this.isNet = data.tournament.is_net
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
	}
}

// TournamentPoints API Schema
export const TournamentPointsApiSchema = z.object({
	id: z.number(),
	tournament: TournamentNestedSchema,
	player: z.number(),
	position: z.number(),
	score: z.number().nullable(),
	points: z.number(),
	details: z.string().nullable(),
	create_date: z.string(),
})

export type TournamentPointsData = z.infer<typeof TournamentPointsApiSchema>

export class TournamentPoints {
	id: number
	tournamentId: number
	eventId: number
	tournamentName: string
	isNet: boolean
	playerId: number
	position: number
	score: number | null
	points: number
	details: string | null
	createDate: Date

	constructor(data: TournamentPointsData) {
		this.id = data.id
		this.tournamentId = data.tournament.id
		this.eventId = data.tournament.event
		this.tournamentName = data.tournament.name
		this.isNet = data.tournament.is_net
		this.playerId = data.player
		this.position = data.position
		this.score = data.score
		this.points = data.points
		this.details = data.details
		this.createDate = new Date(data.create_date)
	}
}

// Aggregation types for My Results page
export interface PayoutLineItem {
	label: string // tournament name
	amount: number
	payoutType: string // "Credit" | "Cash"
	payoutStatus: string
}

export interface EventResultSummary {
	eventId: number
	eventName: string
	eventDate: Date
	grossScore: number | null
	grossPosition: number | null
	netScore: number | null
	netPosition: number | null
	grossPoints: number | null
	netPoints: number | null
	grossPointsDetails: string | null
	netPointsDetails: string | null
	payouts: PayoutLineItem[] // sorted: Credit then Cash
}

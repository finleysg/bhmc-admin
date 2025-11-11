// Top-level response structure
export interface GolfGeniusTournamentResults {
	event: {
		name: string
		adjusted: boolean
		scopes: GGScope[]
		season_points?: unknown[]
		id: number | string
		id_str: string
	}
}

// Scope = Flight/Division
export interface GGScope {
	id: number
	id_str: string
	name?: string
	aggregates: GGAggregate[]
}

// Aggregate = Player/Team Result
export interface GGAggregate {
	id: number | string
	id_str: string
	member_ids: number[] | string[]
	member_ids_str: string[]
	member_cards: GGMemberCard[]
	scorecard_statuses: GGScorecardStatus[]
	position?: string
	rank?: string
	name: string
	score?: string
	total?: string
	points?: string
	purse?: string
	details?: string
	stableford?: string | null
	disposition?: string
	disposition_cause?: string
	individual_results?: GGIndividualResult[]
	points_summary_team_id?: string | null
	team_id?: string
	[key: string]: unknown // Allow additional properties
}

// Tournament format types for discriminated unions
export type TournamentFormat = "points" | "skins" | "user_scored" | "stroke"

// Discriminated union for tournament aggregates - extends GGAggregate for compatibility
export type TournamentAggregate =
	| PointsTournamentAggregate
	| SkinsTournamentAggregate
	| ProxyTournamentAggregate
	| StrokeTournamentAggregate

export interface PointsTournamentAggregate extends GGAggregate {
	format: "points"
	rank?: string
	points?: string
	position?: string
	total?: string
}

export interface SkinsTournamentAggregate extends GGAggregate {
	format: "skins"
	total?: string
	purse?: string
	details?: string
}

export interface ProxyTournamentAggregate extends GGAggregate {
	format: "user_scored"
	position?: string
	purse?: string
	rank?: string
}

export interface StrokeTournamentAggregate extends GGAggregate {
	format: "stroke"
	position?: string
	purse?: string
	total?: string
}

// Member Card = Player Identifier
export interface GGMemberCard {
	member_id: number | string
	member_id_str: string
	member_card_id: number | string
	member_card_id_str: string
}

export interface GGScorecardStatus {
	member_card_id: number | string
	member_card_id_str: string
	status: string
}

// For team events
export interface GGIndividualResult {
	member_id: string
	member_id_str: string
	name: string
	gross_scores?: number[]
	net_scores?: number[]
	gross_extra_holes?: unknown[]
	net_extra_holes?: unknown[]
	to_par_gross?: number[]
	to_par_net?: number[]
	totals?: {
		gross_scores?: {
			out: number | null
			in: number | null
			total: number | null
		}
		net_scores?: {
			out: number | null
			in: number | null
			total: number | null
		}
		to_par_gross?: {
			out: number | null
			in: number | null
			total: number | null
		}
		to_par_net?: {
			out: number | null
			in: number | null
			total: number | null
		}
	}
}

// Service response DTOs
export interface ImportResultSummary {
	tournamentId: number
	tournamentName: string
	eventName: string
	resultsImported: number
	skippedBlinds?: number
	errors: string[]
}

export interface ImportResult {
	tournament: string
	resultsImported: number
	errors: string[]
}

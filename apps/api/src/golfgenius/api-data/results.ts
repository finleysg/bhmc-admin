import { z } from "zod"

const GgScoreTotalsSchema = z.object({
	out: z.number().nullable(),
	in: z.number().nullable(),
	total: z.number().nullable(),
})

const GgIndividualResultTotalsSchema = z.object({
	gross_scores: GgScoreTotalsSchema,
	net_scores: GgScoreTotalsSchema,
	to_par_gross: GgScoreTotalsSchema,
	to_par_net: GgScoreTotalsSchema,
})

const GgMemberCardSchema = z.object({
	member_id: z.number(),
	member_id_str: z.string(),
	member_card_id: z.coerce.number(),
	member_card_id_str: z.string(),
})

const GgIndividualResultSchema = z.object({
	member_id: z.number(),
	member_id_str: z.string(),
	name: z.string(),
	gross_scores: z.array(z.number().nullable()),
	net_scores: z.array(z.number().nullable()),
	gross_extra_holes: z.array(z.unknown()),
	net_extra_holes: z.array(z.unknown()),
	to_par_gross: z.array(z.number().nullable()),
	to_par_net: z.array(z.number().nullable()),
	totals: GgIndividualResultTotalsSchema,
})

/**
 * Schema for Golf Genius aggregate (player/team result)
 * Contains detailed scoring information for a single player or team
 */
export const GgAggregateSchema = z.object({
	id: z.number(),
	id_str: z.string(),
	member_ids: z.array(z.number()),
	member_ids_str: z.array(z.string()),
	member_cards: z.array(GgMemberCardSchema),
	position: z.string().nullish(),
	rank: z.string().nullish(),
	name: z.string().nullable(),
	score: z.string().nullish(),
	stableford: z.string().nullish(),
	total: z.string().nullish(),
	purse: z.string().nullish(),
	points: z.string().nullish(),
	details: z.string().nullish(),
	net_scores: z.array(z.number().nullable()),
	gross_scores: z.array(z.number().nullable()),
	individual_results: z.array(GgIndividualResultSchema).optional(),
})

/**
 * Schema for Golf Genius scope (flight/division)
 * Contains a collection of aggregates (player/team results)
 */
export const GgScopeSchema = z.object({
	id: z.number(),
	id_str: z.string(),
	name: z.string().optional(),
	aggregates: z.array(GgAggregateSchema),
})

/**
 * Schema for Golf Genius event result (tournament results)
 * Contains tournament information and scopes (flights/divisions)
 */
export const GgTournamentResultSchema = z.object({
	id: z.number(),
	id_str: z.string(),
	name: z.string(),
	adjusted: z.boolean(),
	scopes: z.array(GgScopeSchema),
})

/**
 * Schema for Golf Genius event result API response wrapper
 * The API returns the event result wrapped in an "event" property
 */
export const GgTournamentResultWrapperSchema = z.object({
	event: GgTournamentResultSchema,
})

export type GgScoreTotals = z.infer<typeof GgScoreTotalsSchema>
export type GgIndividualResultTotals = z.infer<typeof GgIndividualResultTotalsSchema>
export type GgMemberCard = z.infer<typeof GgMemberCardSchema>
export type GgIndividualResult = z.infer<typeof GgIndividualResultSchema>
export type GgAggregate = z.infer<typeof GgAggregateSchema>
export type GgScope = z.infer<typeof GgScopeSchema>
export type GgTournamentResult = z.infer<typeof GgTournamentResultSchema>
export type GgTournamentResultWrapper = z.infer<typeof GgTournamentResultWrapperSchema>

// Tournament format types for discriminated unions
export type TournamentFormat = "points" | "skins" | "user_scored" | "stroke" | "quota"

// Discriminated union for tournament aggregates
export type TournamentAggregate =
	| PointsTournamentAggregate
	| SkinsTournamentAggregate
	| ProxyTournamentAggregate
	| StrokeTournamentAggregate
	| QuotaTournamentAggregate

export type PointsTournamentAggregate = GgAggregate & { format: "points" }
export type SkinsTournamentAggregate = GgAggregate & { format: "skins" }
export type ProxyTournamentAggregate = GgAggregate & { format: "user_scored" }
export type StrokeTournamentAggregate = GgAggregate & { format: "stroke" }
export type QuotaTournamentAggregate = GgAggregate & { format: "quota" }

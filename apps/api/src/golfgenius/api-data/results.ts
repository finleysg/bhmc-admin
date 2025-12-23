import { z } from "zod"

/**
 * Schema for Golf Genius aggregate (player/team result)
 * Contains detailed scoring information for a single player or team
 * Uses catchall to allow additional unvalidated properties
 */
export const GgAggregateSchema = z
	.object({
		id: z.number(),
		id_str: z.string(),
		member_ids: z.array(z.number()),
		member_ids_str: z.array(z.string()),
		member_cards: z.array(z.unknown()),
		position: z.string(),
		rank: z.string(),
		name: z.string(),
		score: z.string(),
		stableford: z.string().nullable(),
		total: z.string(),
		purse: z.string(),
		net_scores: z.array(z.number().nullable()),
		gross_scores: z.array(z.number().nullable()),
	})
	.catchall(z.unknown())

/**
 * Schema for Golf Genius scope (flight/division)
 * Contains a collection of aggregates (player/team results)
 * Uses catchall to allow additional unvalidated properties
 */
export const GgScopeSchema = z
	.object({
		id: z.number(),
		id_str: z.string(),
		name: z.string(),
		aggregates: z.array(GgAggregateSchema),
	})
	.catchall(z.unknown())

/**
 * Schema for Golf Genius event result (tournament results)
 * Contains tournament information and scopes (flights/divisions)
 * Uses catchall to allow additional unvalidated properties
 */
export const GgTournamentResultSchema = z
	.object({
		id: z.number(),
		id_str: z.string(),
		name: z.string(),
		adjusted: z.boolean(),
		scopes: z.array(GgScopeSchema),
	})
	.catchall(z.unknown())

/**
 * Schema for Golf Genius event result API response wrapper
 * The API returns the event result wrapped in an "event" property
 */
export const GgTournamentResultWrapperSchema = z.object({
	event: GgTournamentResultSchema,
})

export type GgAggregate = z.infer<typeof GgAggregateSchema>
export type GgScope = z.infer<typeof GgScopeSchema>
export type GgTournamentResult = z.infer<typeof GgTournamentResultSchema>
export type GgTournamentResultWrapper = z.infer<typeof GgTournamentResultWrapperSchema>

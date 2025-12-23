import { z } from "zod"

/**
 * Zod schemas for Golf Genius Tournament API responses
 *
 * Note: In this context, "event" in the JSON represents a tournament.
 *
 * Example API response:
 * [
 *   {
 *     "event": {
 *       "id": "11913541123479489334",
 *       "name": "Net East LG/LN - East Division",
 *       "score_format": "stroke",
 *       "handicap_format": "usga_net",
 *       "score_scope": "pos_player",
 *       "result_scope": "rs_flight",
 *       "score_aggregation": "alt_scramble",
 *       // ... many other fields like created_at, scored_at, handicap_adjustment, network_config, etc.
 *     }
 *   }
 * ]
 */

// Schema for a single tournament object
// Validates only the specified fields; all other properties are allowed but not validated
export const GgTournamentSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		score_format: z.string(),
		handicap_format: z.string(),
		score_scope: z.string(),
		result_scope: z.string(),
		score_aggregation: z.string(),
	})
	.catchall(z.unknown())

// Schema for the wrapped tournament object (as returned by the API)
// Note: The API wraps tournaments in an "event" property
export const GgTournamentWrapperSchema = z.object({
	event: GgTournamentSchema,
})

// Schema for the array of wrapped tournament objects
export const GgTournamentsResponseSchema = z.array(GgTournamentWrapperSchema)

// Type exports for use in application code
export type GgTournament = z.infer<typeof GgTournamentSchema>
export type GgTournamentWrapper = z.infer<typeof GgTournamentWrapperSchema>
export type GgTournamentsResponse = z.infer<typeof GgTournamentsResponseSchema>

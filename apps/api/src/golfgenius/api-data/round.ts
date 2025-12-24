import { z } from "zod"

/**
 * Zod schemas for Golf Genius Round API responses
 *
 * Example API response:
 * [
 *   {
 *     "round": {
 *       "id": "11548236464823257738",
 *       "index": 1,
 *       "event_id": "11548235971707325318",
 *       "name": "Round 1",
 *       "date": "2025-04-09",
 *       "status": "completed",
 *       // ... many other fields like pairing_group_size, most_recent, type, settings, etc.
 *     }
 *   }
 * ]
 */

// Schema for a single round object
// Validates only the specified fields; all other properties are allowed but not validated
export const GgRoundSchema = z
	.object({
		id: z.string(),
		index: z.number(),
		event_id: z.string(),
		name: z.string(),
		date: z.string(),
		status: z.string(),
	})

// Schema for the wrapped round object (as returned by the API)
export const GgRoundWrapperSchema = z.object({
	round: GgRoundSchema,
})

// Schema for the array of wrapped round objects
export const GgRoundsResponseSchema = z.array(GgRoundWrapperSchema)

// Type exports for use in application code
export type GgRound = z.infer<typeof GgRoundSchema>
export type GgRoundWrapper = z.infer<typeof GgRoundWrapperSchema>
export type GgRoundsResponse = z.infer<typeof GgRoundsResponseSchema>

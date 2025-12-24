import { z } from "zod"

/**
 * Zod schemas for Golf Genius Season API responses
 *
 * Example API response:
 * [
 *   {
 *     "season": {
 *       "name": "2024",
 *       "current": false,
 *       "archived": false,
 *       "id": "10028065829943298962"
 *     }
 *   },
 *   {
 *     "season": {
 *       "name": "2025",
 *       "current": true,
 *       "archived": false,
 *       "id": "11285976172879465438"
 *     }
 *   }
 * ]
 */

// Schema for a single season object
export const GgSeasonSchema = z.object({
	id: z.string(),
	name: z.string(),
	current: z.boolean(),
	archived: z.boolean(),
})

// Schema for the wrapped season object (as returned by the API)
export const GgSeasonWrapperSchema = z.object({
	season: GgSeasonSchema,
})

// Schema for the array of wrapped season objects
export const GgSeasonsResponseSchema = z.array(GgSeasonWrapperSchema)

// Type exports for use in application code
export type GgSeason = z.infer<typeof GgSeasonSchema>
export type GgSeasonWrapper = z.infer<typeof GgSeasonWrapperSchema>
export type GgSeasonsResponse = z.infer<typeof GgSeasonsResponseSchema>

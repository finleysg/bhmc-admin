import { z } from "zod"

/**
 * Zod schemas for Golf Genius Event API responses
 *
 * Example API response:
 * [
 *   {
 *     "event": {
 *       "id": "11498178393187338905",
 *       "name": "2025 Roster",
 *       "start_date": "2025-04-01",
 *       "end_date": "2025-04-01",
 *       "type": "event",
 *       "website": "bhgc-2025roster.golfgenius.com",
 *       "description": "",
 *       // ... many other fields like season, category, directories, etc.
 *     }
 *   }
 * ]
 */

// Schema for a single event object
// Validates only the specified fields; all other properties are allowed but not validated
export const GgEventSchema = z
	.object({
		id: z.string(),
		ggid: z.string(),
		name: z.string(),
		start_date: z.string(),
		end_date: z.string(),
		type: z.string(),
		website: z.string().optional(),
		description: z.string().optional(),
	})

// Schema for the wrapped event object (as returned by the API)
export const GgEventWrapperSchema = z.object({
	event: GgEventSchema,
})

// Schema for the array of wrapped event objects
export const GgEventsResponseSchema = z.array(GgEventWrapperSchema)

// Type exports for use in application code
export type GgEvent = z.infer<typeof GgEventSchema>
export type GgEventWrapper = z.infer<typeof GgEventWrapperSchema>
export type GgEventsResponse = z.infer<typeof GgEventsResponseSchema>

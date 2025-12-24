import { z } from "zod"

/**
 * Schema for Golf Genius handicap data
 * Contains handicap network information and index values
 * Uses catchall to allow additional unvalidated properties
 */
export const GgHandicapSchema = z
	.object({
		handicap_network_id: z.string(),
		handicap_index: z.string(),
		nine_hole_handicap_index: z.string(),
	})
	.catchall(z.unknown())

/**
 * Schema for Golf Genius member data
 * Contains participant/registration information for an event
 * Uses catchall to allow additional unvalidated properties
 */
export const GgMemberSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		email: z.string(),
		last_name: z.string(),
		first_name: z.string(),
		event_id: z.string(),
		member_card_id: z.string(),
		external_id: z.string().nullable(),
		handicap: GgHandicapSchema,
		custom_fields: z.record(z.string(), z.unknown()), // Catchall collection for dynamic custom fields
	})
	.catchall(z.unknown())

/**
 * Schema for Golf Genius member API response wrapper
 * Each member object is wrapped in a "member" property
 */
export const GgMemberWrapperSchema = z.object({
	member: GgMemberSchema,
})

/**
 * Schema for Golf Genius members API response
 * The API returns an array of wrapped member objects
 */
export const GgMembersResponseSchema = z.array(GgMemberWrapperSchema)

export type GgHandicap = z.infer<typeof GgHandicapSchema>
export type GgMember = z.infer<typeof GgMemberSchema>
export type GgMemberWrapper = z.infer<typeof GgMemberWrapperSchema>
export type GgMembersResponse = z.infer<typeof GgMembersResponseSchema>

/**
 * Payload for syncing our member data to Golf Genius
 */
export interface GgMemberSyncData {
	external_id: string | number
	last_name: string
	first_name: string
	email: string
	gender: string // always "M" for us
	handicap_network_id?: string | null // ghin
	rounds: string[] // array of round ids
	custom_fields: Record<string, string | null>
}

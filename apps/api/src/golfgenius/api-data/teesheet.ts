import { z } from "zod"

import { GgHoleDataSchema } from "./course"

// Tee schema for teesheet (includes course_id)
export const GgTeesheetTeeSchema = z
	.object({
		name: z.string(),
		abbreviation: z.string(),
		hole_data: GgHoleDataSchema,
		id: z.string(),
		course_id: z.string(),
	})

export type GgTeesheetTee = z.infer<typeof GgTeesheetTeeSchema>

// Player schema with scoring and handicap information
export const GgPlayerSchema = z
	.object({
		name: z.string(),
		last_name: z.string(),
		first_name: z.string(),
		position: z.number(),
		member_card_id: z.string(),
		player_roster_id: z.string(),
		handicap_network_id: z.string(),
		player_round_id: z.string(),
		external_id: z.string().nullable(),
		group_number: z.number(),
		team_name: z.string(),
		handicap_index: z.string(),
		course_handicap: z.string(),
		score_array: z.array(z.number().nullable()),
		handicap_dots_by_hole: z.array(z.number()),
		tee: GgTeesheetTeeSchema,
	})

export type GgPlayer = z.infer<typeof GgPlayerSchema>

// Pairing group schema with tee time and players
export const GgPairingGroupSchema = z
	.object({
		id: z.string(),
		hole: z.number(),
		tee_time: z.string(),
		date: z.string(),
		foursome_ggid: z.string(),
		players: z.array(GgPlayerSchema),
	})

export type GgPairingGroup = z.infer<typeof GgPairingGroupSchema>

// Wrapper schema for pairing group
export const GgPairingGroupWrapperSchema = z.object({
	pairing_group: GgPairingGroupSchema,
})

export type GgPairingGroupWrapper = z.infer<typeof GgPairingGroupWrapperSchema>

// Response schema for teesheet endpoint
export const GgTeesheetResponseSchema = z.array(GgPairingGroupWrapperSchema)

export type GgTeesheetResponse = z.infer<typeof GgTeesheetResponseSchema>

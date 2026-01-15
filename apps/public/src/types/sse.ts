import { z } from "zod"

import { PlayerApiData, ServerPlayerApiSchema } from "../models/player"
import { RegistrationSlotData, ServerRegistrationFeeApiSchema } from "../models/registration"

// SSE slot schema - same as ServerRegistrationSlotApiSchema
export const SSESlotSchema = z.object({
	id: z.number(),
	eventId: z.number(),
	registrationId: z.number().nullish(),
	holeId: z.number().nullish(),
	player: ServerPlayerApiSchema.nullish(),
	startingOrder: z.number(),
	slot: z.number(),
	status: z.string(),
	fees: z.array(ServerRegistrationFeeApiSchema),
})

export const SSEUpdateEventSchema = z.object({
	eventId: z.number(),
	timestamp: z.string(),
	slots: z.array(SSESlotSchema),
	currentWave: z.number(),
})

export const SSEHeartbeatEventSchema = z.object({
	timestamp: z.string(),
})

export const SSEErrorEventSchema = z.object({
	message: z.string(),
	code: z.string().optional(),
})

export type SSESlotData = z.infer<typeof SSESlotSchema>
export type SSEUpdateEvent = z.infer<typeof SSEUpdateEventSchema>
export type SSEHeartbeatEvent = z.infer<typeof SSEHeartbeatEventSchema>
export type SSEErrorEvent = z.infer<typeof SSEErrorEventSchema>

/**
 * Transform SSE slot data (NestJS camelCase) to API format (Python snake_case)
 * for direct React Query cache updates.
 */
export function transformSlotsToApiFormat(slots: SSESlotData[]): RegistrationSlotData[] {
	return slots.map((slot) => ({
		id: slot.id,
		event: slot.eventId,
		registration: slot.registrationId,
		hole: slot.holeId,
		player: slot.player ? transformPlayerToApiFormat(slot.player) : null,
		starting_order: slot.startingOrder,
		slot: slot.slot,
		status: slot.status,
	}))
}

function transformPlayerToApiFormat(player: z.infer<typeof ServerPlayerApiSchema>): PlayerApiData {
	return {
		id: player.id,
		email: player.email,
		first_name: player.firstName,
		last_name: player.lastName,
		ghin: player.ghin,
		birth_date: player.birthDate,
		phone_number: player.phoneNumber,
		tee: player.tee,
		is_member: player.isMember,
		last_season: player.lastSeason,
		profile_picture: null,
	}
}

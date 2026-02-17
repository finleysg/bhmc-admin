import { useQuery } from "@tanstack/react-query"

import type { ServerRegistration } from "../registration/types"

interface PlayerRegistrationResponse {
	registration: ServerRegistration
}

export function usePlayerRegistration(eventId: number | undefined, playerId: number | undefined) {
	return useQuery({
		queryKey: ["player-registration", eventId, playerId],
		queryFn: async () => {
			const params = new URLSearchParams()
			if (eventId) params.set("event_id", String(eventId))
			if (playerId) params.set("player_id", String(playerId))
			const response = await fetch(`/api/registration?${params.toString()}`)
			if (!response.ok) {
				if (response.status === 404) return null
				throw new Error("Failed to fetch registration")
			}
			return response.json() as Promise<PlayerRegistrationResponse>
		},
		enabled: !!eventId && !!playerId,
	})
}

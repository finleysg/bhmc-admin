import { useQuery } from "@tanstack/react-query"

import type { ServerRegistration } from "../registration/types"

export function useEventRegistrations(eventId: number | undefined) {
	return useQuery({
		queryKey: ["event-registrations", eventId],
		queryFn: async () => {
			const response = await fetch(`/api/registration?event_id=${eventId}`)
			if (!response.ok) throw new Error("Failed to fetch registrations")
			return response.json() as Promise<ServerRegistration[]>
		},
		enabled: !!eventId,
	})
}

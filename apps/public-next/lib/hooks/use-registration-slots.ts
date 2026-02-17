import { useQuery } from "@tanstack/react-query"

import type { RegistrationSlot } from "../types"

export function useRegistrationSlots(eventId: number | undefined) {
	return useQuery({
		queryKey: ["event-registration-slots", eventId],
		queryFn: async () => {
			const response = await fetch(`/api/registration-slots?event_id=${eventId}`)
			if (!response.ok) throw new Error("Failed to fetch registration slots")
			return response.json() as Promise<RegistrationSlot[]>
		},
		enabled: !!eventId,
	})
}

import { useQuery } from "@tanstack/react-query"

import type { RegistrationSlot } from "../types"

export function useOpenSlots(eventId: number, holeId: number, startingOrder: number) {
	return useQuery({
		queryKey: ["open-slots", eventId, holeId, startingOrder],
		queryFn: async () => {
			const params = new URLSearchParams({
				event_id: String(eventId),
				hole_id: String(holeId),
				starting_order: String(startingOrder),
				is_open: "True",
			})
			const response = await fetch(`/api/registration-slots?${params.toString()}`)
			if (!response.ok) throw new Error("Failed to fetch open slots")
			return response.json() as Promise<RegistrationSlot[]>
		},
		enabled: !!eventId && !!holeId && startingOrder != null,
		staleTime: Infinity,
		gcTime: 0,
	})
}

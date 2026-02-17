import { useQuery } from "@tanstack/react-query"

import type { ClubEvent } from "../types"

export function useClubEvents(season: number) {
	return useQuery({
		queryKey: ["club-events", season],
		queryFn: async () => {
			const params = new URLSearchParams()
			if (season > 0) params.set("season", String(season))
			const response = await fetch(`/api/events?${params.toString()}`)
			if (!response.ok) throw new Error("Failed to fetch events")
			return response.json() as Promise<ClubEvent[]>
		},
	})
}

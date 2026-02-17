import { useQuery } from "@tanstack/react-query"

export interface AvailableGroup {
	hole_number: number
	starting_order: number
	slots: { id: number }[]
}

export function useAvailableGroups(
	eventId: number | undefined,
	courseId: number | undefined,
	playerCount: number,
) {
	return useQuery({
		queryKey: ["available-groups", eventId, courseId, playerCount],
		queryFn: async () => {
			const params = new URLSearchParams({
				course_id: String(courseId),
				player_count: String(playerCount),
			})
			const response = await fetch(`/api/events/${eventId}/available-groups?${params.toString()}`)
			if (!response.ok) {
				throw new Error("Failed to fetch available groups")
			}
			return response.json() as Promise<AvailableGroup[]>
		},
		enabled: !!eventId && !!courseId && playerCount > 0,
	})
}

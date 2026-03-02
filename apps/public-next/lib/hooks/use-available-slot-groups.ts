import { useQuery } from "@tanstack/react-query"

export interface AvailableSlotGroup {
	holeId: number
	holeNumber: number
	startingOrder: number
	slots: { id: number }[]
}

export function useAvailableSlotGroups(
	eventId: number | undefined,
	courseId: number | undefined,
	playerCount: number | undefined,
) {
	return useQuery({
		queryKey: ["available-slot-groups", eventId, courseId, playerCount],
		queryFn: async () => {
			const response = await fetch(
				`/api/events/${eventId}/available-slots?courseId=${courseId}&players=${playerCount}`,
			)
			if (!response.ok) {
				throw new Error("Failed to fetch available slots")
			}
			return (await response.json()) as AvailableSlotGroup[]
		},
		enabled: !!eventId && !!courseId && !!playerCount,
	})
}

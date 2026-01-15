import { useQuery } from "@tanstack/react-query"

import { AvailableGroup, AvailableGroupApiSchema } from "../models/available-group"
import { getMany } from "../utils/api-client"

export function useAvailableGroups(eventId: number, courseId: number, playerCount: number) {
	const endpoint = `events/${eventId}/available_groups/?course_id=${courseId}&player_count=${playerCount}`
	return useQuery<AvailableGroup[]>({
		queryKey: ["available-groups", eventId, courseId, playerCount],
		queryFn: () => getMany(endpoint, AvailableGroupApiSchema),
		enabled: !!eventId && !!courseId && !!playerCount,
	})
}

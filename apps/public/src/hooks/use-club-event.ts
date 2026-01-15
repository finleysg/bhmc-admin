import { useQuery } from "@tanstack/react-query"

import { ClubEvent, ClubEventApiSchema, ClubEventData } from "../models/club-event"
import { getOne } from "../utils/api-client"

export function useClubEvent(eventId: number | null) {
	const endpoint = `events/${eventId}`

	return useQuery({
		queryKey: ["club-events", eventId],
		queryFn: () => getOne<ClubEventData>(endpoint, ClubEventApiSchema),
		select: (data) => new ClubEvent(data!),
		enabled: eventId !== null,
	})
}

import { useQuery } from "@tanstack/react-query"

import { ClubEvent, ClubEventApiSchema, ClubEventData } from "../models/club-event"
import { getMany } from "../utils/api-client"
import { currentSeason } from "../utils/app-config"

const getClubEvents = (data: ClubEventData[]) => {
	return data.map((obj) => new ClubEvent(obj))
}

// supports a season === 0 to retrieve all events
export function useClubEvents(season?: number | null) {
	const endpoint = `events/?season=${season !== null && season !== undefined ? season : currentSeason}`

	return useQuery({
		queryKey: [
			"club-events",
			"season",
			season !== null && season !== undefined ? season : currentSeason,
		],
		queryFn: () => getMany<ClubEventData>(endpoint, ClubEventApiSchema),
		select: getClubEvents,
	})
}

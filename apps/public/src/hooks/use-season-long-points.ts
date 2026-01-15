import { useQuery } from "@tanstack/react-query"

import {
	PlayerPoints,
	PlayerPointsApiSchema,
	PlayerPointsData,
	TopPoints,
	TopPointsData,
	TopPointsSchema,
} from "../models/points"
import { getMany } from "../utils/api-client"

interface TopPointsArgs {
	season: number
	topN: number
	category: "gross" | "net"
}

export function useTopPoints({ season, topN, category }: TopPointsArgs) {
	const endpoint = `season-long-points/top_points/?season=${season}&category=${category}&top=${topN}`

	return useQuery({
		queryKey: ["season-long-points", season, category, topN],
		queryFn: () => getMany<TopPointsData>(endpoint, TopPointsSchema),
		select: (data) => data.map((pt) => new TopPoints(pt)),
	})
}

interface SeasonLongPointsArgs {
	season?: number
	eventId?: number
	playerId?: number
}

export function useSeasonLongPoints({ season, eventId, playerId }: SeasonLongPointsArgs) {
	let endpoint = "season-long-points/"
	if (season) {
		endpoint += `?season=${season}` + (playerId ? `&player=${playerId}` : "")
	} else if (eventId) {
		endpoint += `?event=${eventId}`
	} else {
		throw new Error(
			"You must provide either a season or an eventId to retrieve season long points.",
		)
	}

	return useQuery({
		queryKey: ["season-long-points", season ?? 0, playerId ?? 0, eventId ?? 0],
		queryFn: () => getMany<PlayerPointsData>(endpoint, PlayerPointsApiSchema),
		select: (data) => data.map((pp) => new PlayerPoints(pp)),
	})
}

export function usePlayerPoints({ season, playerId }: SeasonLongPointsArgs) {
	const endpoint = `season-long-points/?season=${season}&player=${playerId}`
	return useQuery({
		queryKey: ["season-long-points", season, playerId],
		queryFn: () => getMany<PlayerPointsData>(endpoint, PlayerPointsApiSchema),
		select: (data) => data.map((pp) => new PlayerPoints(pp)),
		enabled: playerId !== undefined,
	})
}

import { useQuery } from "@tanstack/react-query"

import {
	TournamentPoints,
	TournamentPointsApiSchema,
	TournamentPointsData,
	TournamentResult,
	TournamentResultApiSchema,
	TournamentResultData,
} from "../models/tournament-results"
import { getMany } from "../utils/api-client"

interface TournamentResultsArgs {
	playerId?: number
	season?: number
}

export function useTournamentResults({ playerId, season }: TournamentResultsArgs) {
	let endpoint = "tournament-results/"
	const params = []
	if (playerId) params.push(`player=${playerId}`)
	if (season) params.push(`season=${season}`)
	if (params.length > 0) {
		endpoint += `?${params.join("&")}`
	}

	return useQuery({
		queryKey: ["tournament-results", playerId ?? 0, season ?? 0],
		queryFn: () => getMany<TournamentResultData>(endpoint, TournamentResultApiSchema),
		select: (data) => data.map((result) => new TournamentResult(result)),
		enabled: playerId !== undefined && playerId > 0,
	})
}

interface TournamentPointsArgs {
	playerId?: number
	season?: number
}

export function useTournamentPoints({ playerId, season }: TournamentPointsArgs) {
	let endpoint = "tournament-points/"
	const params = []
	if (playerId) params.push(`player=${playerId}`)
	if (season) params.push(`season=${season}`)
	if (params.length > 0) {
		endpoint += `?${params.join("&")}`
	}

	return useQuery({
		queryKey: ["tournament-points", playerId ?? 0, season ?? 0],
		queryFn: () => getMany<TournamentPointsData>(endpoint, TournamentPointsApiSchema),
		select: (data) => data.map((points) => new TournamentPoints(points)),
		enabled: playerId !== undefined && playerId > 0,
	})
}

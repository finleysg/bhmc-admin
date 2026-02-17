import { useQuery } from "@tanstack/react-query"

import type { RegistrationSlot, TournamentPointsData, TournamentResultData } from "../types"

export function useTournamentResults(playerId: number | undefined, season: number) {
	return useQuery({
		queryKey: ["tournament-results", playerId, season],
		queryFn: async () => {
			const params = new URLSearchParams()
			if (playerId) params.set("player", String(playerId))
			if (season > 0) params.set("season", String(season))
			const response = await fetch(`/api/tournament-results?${params.toString()}`)
			if (!response.ok) throw new Error("Failed to fetch tournament results")
			return response.json() as Promise<TournamentResultData[]>
		},
		enabled: !!playerId,
	})
}

export function useTournamentPoints(playerId: number | undefined, season: number) {
	return useQuery({
		queryKey: ["tournament-points", playerId, season],
		queryFn: async () => {
			const params = new URLSearchParams()
			if (playerId) params.set("player", String(playerId))
			if (season > 0) params.set("season", String(season))
			const response = await fetch(`/api/tournament-points?${params.toString()}`)
			if (!response.ok) throw new Error("Failed to fetch tournament points")
			return response.json() as Promise<TournamentPointsData[]>
		},
		enabled: !!playerId,
	})
}

export function useMyEvents(playerId: number | undefined, season: number) {
	return useQuery({
		queryKey: ["my-events", playerId, season],
		queryFn: async () => {
			const params = new URLSearchParams()
			if (playerId) params.set("player_id", String(playerId))
			if (season > 0) params.set("seasons", String(season))
			const response = await fetch(`/api/registration-slots?${params.toString()}`)
			if (!response.ok) throw new Error("Failed to fetch registration slots")
			return response.json() as Promise<RegistrationSlot[]>
		},
		enabled: !!playerId,
	})
}

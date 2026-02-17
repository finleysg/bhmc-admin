import { useMutation, useQuery } from "@tanstack/react-query"

import type { PlayerRoundData } from "../types"

export function usePlayerScores(season: number, playerId: number | undefined) {
	return useQuery({
		queryKey: ["scores", season, playerId],
		queryFn: async () => {
			const params = new URLSearchParams()
			if (season > 0) params.set("season", String(season))
			if (playerId) params.set("player", String(playerId))
			const response = await fetch(`/api/scores?${params.toString()}`)
			if (!response.ok) throw new Error("Failed to fetch scores")
			return response.json() as Promise<PlayerRoundData[]>
		},
		enabled: !!playerId,
	})
}

export type ScoreType = "gross" | "net" | "both"

interface ExportScoresParams {
	season: number
	courseIds?: number[]
	scoreType?: ScoreType
}

export function useExportScores() {
	return useMutation({
		mutationFn: async ({ season, courseIds, scoreType }: ExportScoresParams) => {
			const params = new URLSearchParams()
			params.set("season", String(season))
			if (courseIds && courseIds.length > 0) {
				params.set("courseIds", courseIds.join(","))
			}
			if (scoreType) {
				params.set("scoreType", scoreType)
			}

			const response = await fetch(`/api/scores/export?${params.toString()}`)
			if (!response.ok) throw new Error("Failed to export scores")

			const blob = await response.blob()
			const downloadUrl = window.URL.createObjectURL(blob)
			const link = document.createElement("a")
			link.href = downloadUrl
			link.download = `my-scores-${season}.xlsx`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			window.URL.revokeObjectURL(downloadUrl)
		},
	})
}

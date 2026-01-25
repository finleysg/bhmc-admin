import { useMutation } from "@tanstack/react-query"

import { serverUrl } from "../utils/api-utils"

export type ScoreType = "gross" | "net" | "both"

interface ExportScoresParams {
	season: number
	courseIds?: number[]
	scoreType?: ScoreType
}

async function exportScores({ season, courseIds, scoreType }: ExportScoresParams): Promise<void> {
	const params = new URLSearchParams()
	if (courseIds && courseIds.length > 0) {
		params.set("courseIds", courseIds.join(","))
	}
	if (scoreType) {
		params.set("scoreType", scoreType)
	}

	const queryString = params.toString()
	const url = serverUrl(
		`reports/member/scores/${season}/export${queryString ? `?${queryString}` : ""}`,
	)

	const response = await fetch(url, {
		method: "GET",
		credentials: "include",
	})

	if (!response.ok) {
		throw new Error("Failed to export scores")
	}

	const blob = await response.blob()
	const downloadUrl = window.URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.href = downloadUrl
	link.download = `my-scores-${season}.xlsx`
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	window.URL.revokeObjectURL(downloadUrl)
}

export function useExportScores() {
	return useMutation({
		mutationFn: exportScores,
	})
}

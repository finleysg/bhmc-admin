import { useQuery } from "@tanstack/react-query"

import { LowScore, LowScoreApiSchema, LowScoreData } from "../models/low-score"
import { getMany } from "../utils/api-client"

export function useLowScores(season: number) {
	const endpoint = `low-scores/?season=${season}`

	return useQuery({
		queryKey: ["low-scores"],
		queryFn: () => getMany<LowScoreData>(endpoint, LowScoreApiSchema),
		select: (data) => data.map((champ) => new LowScore(champ)),
	})
}

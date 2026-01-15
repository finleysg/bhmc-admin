import { useQuery } from "@tanstack/react-query"

import { MajorChampion, MajorChampionApiSchema, MajorChampionData } from "../models/major-champion"
import { getMany } from "../utils/api-client"

export function usePlayerChampionships(playerId: number) {
	const endpoint = `champions/?player=${playerId}`

	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany<MajorChampionData>(endpoint, MajorChampionApiSchema),
		select: (data) => data.map((champ) => new MajorChampion(champ)),
	})
}

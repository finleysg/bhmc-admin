import { useQuery } from "@tanstack/react-query"

import { Ace, AceApiSchema, AceData } from "../models/ace"
import { getMany } from "../utils/api-client"

const mapper = (data: AceData[]) => data.map((ace) => new Ace(ace))

export function useAces(season: number) {
	const endpoint = `aces/?season=${season}`

	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany<AceData>(endpoint, AceApiSchema),
		select: mapper,
	})
}

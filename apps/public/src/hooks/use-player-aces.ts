import { useQuery } from "@tanstack/react-query"

import { Ace, AceApiSchema, AceData } from "../models/ace"
import { getMany } from "../utils/api-client"

export function usePlayerAces(playerId: number) {
	const endpoint = `aces/?player_id=${playerId}`

	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany<AceData>(endpoint, AceApiSchema),
		select: (data) => data.map((ace) => new Ace(ace)),
	})
}

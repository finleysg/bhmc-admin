import { useQuery } from "@tanstack/react-query"

import { Player, PlayerApiData, PlayerApiSchema } from "../models/player"
import { getOne } from "../utils/api-client"

const mapper = (data: PlayerApiData | undefined) => (data ? new Player(data) : undefined)

export function usePlayer(playerId: number) {
	const endpoint = `players/${playerId}`

	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getOne<PlayerApiData>(endpoint, PlayerApiSchema),
		select: mapper,
	})
}

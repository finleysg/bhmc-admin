import { useQuery } from "@tanstack/react-query"

import { PlayerRound, PlayerRoundApiSchema, PlayerRoundData } from "../models/scores"
import { getMany } from "../utils/api-client"

const mapper = (data: PlayerRoundData[]) => data.map((round) => new PlayerRound(round))

export function useEventScores(eventId: number) {
	const endpoint = `scores/?event=${eventId}`
	return useQuery({
		queryKey: ["scores", eventId],
		queryFn: () => getMany<PlayerRoundData>(endpoint, PlayerRoundApiSchema),
		select: mapper,
	})
}

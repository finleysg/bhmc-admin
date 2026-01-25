import { useQuery } from "@tanstack/react-query"

import { PlayerRound, PlayerRoundApiSchema, PlayerRoundData } from "../models/scores"
import { getMany } from "../utils/api-client"

const selectPlayerRounds = (data: PlayerRoundData[]) => data.map((round) => new PlayerRound(round))

export function usePlayerScores(season: number, playerId: number | undefined) {
	const endpoint = `scores/?season=${season}&player=${playerId}`
	return useQuery({
		queryKey: ["scores", season, playerId],
		queryFn: () => getMany<PlayerRoundData>(endpoint, PlayerRoundApiSchema),
		select: selectPlayerRounds,
		enabled: playerId !== undefined && playerId > 0,
	})
}

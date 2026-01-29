import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { GuestPlayerData, Player, PlayerApiData, PlayerApiSchema } from "../models/player"
import { getMany, httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

const endpoint = "players"

const mapper = (data: PlayerApiData[]) => data.map((player) => new Player(player))

export function usePlayers() {
	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany<PlayerApiData>(endpoint, PlayerApiSchema),
		select: mapper,
	})
}

export function usePlayerCreate() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (player: GuestPlayerData) => {
			return httpClient(apiUrl(endpoint), {
				body: JSON.stringify(player),
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [endpoint] })
		},
	})
}

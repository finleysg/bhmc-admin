import { useMutation, useQueryClient } from "@tanstack/react-query"

import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

interface SwapPlayersArgs {
	slotId: number
	playerId: number
}

export function useSwapPlayers() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ slotId, playerId }: SwapPlayersArgs) => {
			return httpClient(apiUrl(`registration-slots/${slotId}`), {
				method: "PATCH",
				body: JSON.stringify({
					player: playerId,
				}),
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["event-registrations"] })
			queryClient.invalidateQueries({ queryKey: ["event-registration-slots"] })
			queryClient.invalidateQueries({ queryKey: ["player-registration"] })
		},
	})
}

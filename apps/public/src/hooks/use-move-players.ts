import { useMutation, useQueryClient } from "@tanstack/react-query"

import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

interface MovePlayersArgs {
	registrationId: number
	sourceSlotIds: number[]
	destinationSlotIds: number[]
}

export function useMovePlayers() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ registrationId, sourceSlotIds, destinationSlotIds }: MovePlayersArgs) => {
			return httpClient(apiUrl(`registration/${registrationId}/move/`), {
				method: "PUT",
				body: JSON.stringify({
					source_slots: sourceSlotIds,
					destination_slots: destinationSlotIds,
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

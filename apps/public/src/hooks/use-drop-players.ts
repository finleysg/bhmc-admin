import { useMutation, useQueryClient } from "@tanstack/react-query"

import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

interface DropPlayersArgs {
	registrationId: number
	slotIds: number[]
}

export function useDropPlayers() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ registrationId, slotIds }: DropPlayersArgs) => {
			return httpClient(apiUrl(`registration/${registrationId}/drop/`), {
				method: "DELETE",
				body: JSON.stringify({
					source_slots: slotIds,
				}),
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["event-registrations"] })
			queryClient.invalidateQueries({ queryKey: ["event-registration-slots"] })
			queryClient.invalidateQueries({ queryKey: ["player-registration"] })
			queryClient.invalidateQueries({ queryKey: ["my-events"] })
		},
	})
}

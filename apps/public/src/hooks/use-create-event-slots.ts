import { useMutation, useQueryClient } from "@tanstack/react-query"

import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

export function useCreateEventSlots() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ eventId }: { eventId: number }) => {
			return httpClient(apiUrl(`events/${eventId}/create_slots/`), {
				method: "POST",
			})
		},
		onSuccess: (_, args) => {
			queryClient.invalidateQueries({ queryKey: ["club-events", args.eventId] })
			queryClient.invalidateQueries({ queryKey: ["event-registration-slots", args.eventId] })
		},
	})
}

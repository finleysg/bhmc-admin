import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ClubEventData } from "../models/club-event"
import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

export function useEventPatch() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: Partial<ClubEventData>) => {
			return httpClient(apiUrl(`events/${data.id}/`), {
				method: "PATCH",
				body: JSON.stringify(data),
			})
		},
		onSuccess: (_, args) => {
			queryClient.invalidateQueries({ queryKey: ["club-events", args.id] })
		},
	})
}

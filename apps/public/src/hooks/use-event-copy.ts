import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ClubEventApiSchema, ClubEventData } from "../models/club-event"
import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

export interface CopyEventArgs {
	season: number
	eventId: number
	startDate: string
}
export function useCopyEvent() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ eventId, startDate }: CopyEventArgs) => {
			return httpClient(apiUrl(`events/${eventId}/copy_event/?start_dt=${startDate}`), {
				method: "POST",
			})
		},
		onSuccess: (data: ClubEventData, { season }: CopyEventArgs) => {
			queryClient.setQueryData(["club-events", data.id], ClubEventApiSchema.parse(data))
			return queryClient.invalidateQueries({ queryKey: ["club-events", "season", season] })
		},
	})
}

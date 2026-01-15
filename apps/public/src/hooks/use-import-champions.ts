import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ClubEvent } from "../models/club-event"
import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

interface ImportChampionsArgs {
	clubEvent: ClubEvent
	documentId: number
}

export function useImportChampions() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ clubEvent, documentId }: ImportChampionsArgs) => {
			return httpClient(apiUrl("import-champions"), {
				method: "POST",
				body: JSON.stringify({
					event_id: clubEvent.id,
					document_id: documentId,
				}),
			})
		},
		onSuccess: (data: string[], args) => {
			queryClient.invalidateQueries({
				queryKey: ["champions", args.clubEvent.season, args.clubEvent.id],
			})
			return data
		},
	})
}

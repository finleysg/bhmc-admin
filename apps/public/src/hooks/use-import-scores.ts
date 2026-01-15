import { useMutation, useQueryClient } from "@tanstack/react-query"

import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

export function useImportScores() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ eventId, documentId }: { eventId: number; documentId: number }) => {
			return httpClient(apiUrl("import-scores"), {
				method: "POST",
				body: JSON.stringify({
					event_id: eventId,
					document_id: documentId,
				}),
			})
		},
		onSuccess: (data: string[], args) => {
			queryClient.invalidateQueries({ queryKey: ["scores", args.eventId] })
			return data
		},
	})
}

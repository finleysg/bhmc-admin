import { useMutation, useQueryClient } from "@tanstack/react-query"

import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

export function useImportPoints() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ eventId, documentId }: { eventId: number; documentId: number }) => {
			return httpClient(apiUrl("import-points"), {
				method: "POST",
				body: JSON.stringify({
					event_id: eventId,
					document_id: documentId,
				}),
			})
		},
		onSuccess: (data: string[]) => {
			queryClient.invalidateQueries({ queryKey: ["season-long-points"] })
			return data
		},
	})
}

export function useImportMajorPoints() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ eventId, documentId }: { eventId: number; documentId: number }) => {
			return httpClient(apiUrl("import-major-points"), {
				method: "POST",
				body: JSON.stringify({
					event_id: eventId,
					document_id: documentId,
				}),
			})
		},
		onSuccess: (data: string[]) => {
			queryClient.invalidateQueries({ queryKey: ["season-long-points"] })
			return data
		},
	})
}

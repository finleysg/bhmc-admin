import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { BhmcDocument, DocumentApiSchema, DocumentData } from "../models/document"
import { getMany, httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"
import { twoMinutes } from "../utils/app-config"

interface DocumentArgs {
	documentId?: number
	formData: FormData
}

const mapper = (data: DocumentData[]) => data.map((doc) => new BhmcDocument(doc))

export function useEventDocuments(eventId: number) {
	return useQuery({
		queryKey: ["documents", eventId],
		queryFn: () => getMany(`documents/?event_id=${eventId}`, DocumentApiSchema),
		select: mapper,
		staleTime: twoMinutes,
		enabled: eventId > 0,
	})
}

export function useEventDocumentSave(eventId: number) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (args: DocumentArgs) => {
			if (args.documentId) {
				return httpClient(apiUrl(`documents/${args.documentId}`), {
					body: args.formData,
					method: "PUT",
				})
			} else {
				return httpClient(apiUrl("documents"), { body: args.formData })
			}
		},
		onSuccess: (data: DocumentData) => {
			queryClient.invalidateQueries({ queryKey: ["documents", eventId] })
			return data
		},
	})
}

export function useEventDocumentDelete(eventId: number) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (documentId: number) =>
			httpClient(apiUrl(`documents/${documentId}`), { method: "DELETE" }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["documents", eventId] })
		},
	})
}

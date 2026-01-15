import { useQuery } from "@tanstack/react-query"

import { BhmcDocument, DocumentApiSchema } from "../models/document"
import { getMany } from "../utils/api-client"

export function useDocuments(documentType: string, year?: number | null) {
	const endpoint = `documents/?type=${documentType}` + (year ? `&year=${year}` : "")
	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany(endpoint, DocumentApiSchema),
		select: (data) => data.map((doc) => new BhmcDocument(doc)),
	})
}

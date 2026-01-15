import { useQuery } from "@tanstack/react-query"

import { ContentApiSchema } from "../models/content"
import { getOne } from "../utils/api-client"

export function usePageContent(contentKey: string) {
	const endpoint = `page-content/?key=${contentKey}`

	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getOne(endpoint, ContentApiSchema),
	})
}

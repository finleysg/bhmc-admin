import { useQuery } from "@tanstack/react-query"

import { Tag, TagApiSchema } from "../models/tag"
import { getMany } from "../utils/api-client"

export function useTags() {
	const endpoint = "tags"

	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany(endpoint, TagApiSchema),
		select: (data) => data.map((t) => new Tag(t)),
	})
}

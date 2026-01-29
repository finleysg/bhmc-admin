import { useQuery } from "@tanstack/react-query"

import { Tag, TagApiSchema, TagData } from "../models/tag"
import { getMany } from "../utils/api-client"

const mapper = (data: TagData[]) => data.map((t) => new Tag(t))

export function useTags() {
	const endpoint = "tags"

	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany(endpoint, TagApiSchema),
		select: mapper,
	})
}

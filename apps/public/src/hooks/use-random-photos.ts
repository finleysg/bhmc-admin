import { useQuery } from "@tanstack/react-query"

import { Photo, PhotoApiSchema, PhotoData } from "../models/photo"
import { getMany } from "../utils/api-client"

const mapper = (data: PhotoData[]) => data.map((p) => new Photo(p))

export function useRandomPhotos(take: number, tag: string | undefined) {
	const getUrl = () => {
		if (tag) {
			return `photos/random/?take=${take}&tag=${tag}`
		} else {
			return `photos/random/?take=${take}`
		}
	}
	const url = getUrl()

	return useQuery({
		queryKey: ["random-photos", tag ?? "none"],
		queryFn: () => getMany(url, PhotoApiSchema),
		select: mapper,
		staleTime: 0,
	})
}

import { useMutation, useQuery } from "@tanstack/react-query"

import { Photo, PhotoApiSchema } from "../models/photo"
import { getMany, getOne, httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

export function usePhotos(season: number, tags: string[]) {
	const taglist = tags.map((tag) => `tags=${tag}`).join("&")
	const endpoint = `photos/?season=${season}&${taglist}`
	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany(endpoint, PhotoApiSchema),
		select: (data) => data.map((photo) => new Photo(photo)),
	})
}

export function usePhoto(photoId: number) {
	const endpoint = `photos/${photoId}/`
	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getOne(endpoint, PhotoApiSchema),
		select: (data) => {
			if (data) {
				return new Photo(data)
			}
		},
	})
}

export function useUploadPhoto() {
	return useMutation({
		mutationFn: (formData: FormData) => httpClient(apiUrl(`photos/`), { body: formData }),
	})
}

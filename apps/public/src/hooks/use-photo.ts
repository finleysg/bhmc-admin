import { useMutation, useQuery } from "@tanstack/react-query"

import { Photo, PhotoApiSchema, PhotoData } from "../models/photo"
import { getMany, getOne, httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

const photosMapper = (data: PhotoData[]) => data.map((photo) => new Photo(photo))
const photoMapper = (data: PhotoData | undefined) => (data ? new Photo(data) : undefined)

export function usePhotos(season: number, tags: string[]) {
	const taglist = tags.map((tag) => `tags=${tag}`).join("&")
	const endpoint = `photos/?season=${season}&${taglist}`
	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany(endpoint, PhotoApiSchema),
		select: photosMapper,
	})
}

export function usePhoto(photoId: number) {
	const endpoint = `photos/${photoId}/`
	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getOne(endpoint, PhotoApiSchema),
		select: photoMapper,
	})
}

export function useUploadPhoto() {
	return useMutation({
		mutationFn: (formData: FormData) => httpClient(apiUrl(`photos/`), { body: formData }),
	})
}

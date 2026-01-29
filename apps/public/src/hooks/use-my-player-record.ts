import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Player, PlayerApiData, PlayerApiSchema } from "../models/player"
import { getOne, httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"
import { useAuth } from "./use-auth"

const mapper = (data: PlayerApiData | null | undefined) => new Player(data!)

export function useMyPlayerRecord() {
	const { user } = useAuth()
	const queryClient = useQueryClient()
	const email = user.email

	return useQuery({
		queryKey: ["player", email],
		queryFn: () => getOne(apiUrl(`players/?email=${email}`), PlayerApiSchema),
		initialData: () => {
			return queryClient.getQueryData<PlayerApiData | null>(["player", email])
		},
		enabled: email !== undefined && email !== "unknown",
		select: mapper,
	})
}

export function useUpdateMyPlayerRecord() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (updates: PlayerApiData) => {
			const endpoint = apiUrl(`players/${updates.id}/`)
			return httpClient(endpoint, {
				method: "PUT",
				body: JSON.stringify(updates),
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["player"] })
			window.location.reload()
		},
	})
}

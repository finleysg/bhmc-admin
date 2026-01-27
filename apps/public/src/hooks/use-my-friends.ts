import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Player, PlayerApiData, PlayerApiSchema } from "../models/player"
import { getMany, httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"
import { useMyPlayerRecord } from "./use-my-player-record"

const selectFriends = (data: PlayerApiData[]) => {
	return data.map((p) => new Player(p, true))
}

export function useMyFriends() {
	const { data: player } = useMyPlayerRecord()
	const endpoint = apiUrl(`players/${player?.id}/friends`)

	return useQuery({
		queryKey: ["friends"],
		queryFn: () => getMany(endpoint, PlayerApiSchema),
		select: selectFriends,
		enabled: player !== undefined,
	})
}

export function useAddFriend() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (friendId: number) => {
			const endpoint = apiUrl(`players/${friendId}/add_friend/`)
			return httpClient(endpoint, { method: "POST" })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["friends"] })
		},
	})
}

export function useRemoveFriend() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (friendId: number) => {
			const endpoint = apiUrl(`players/${friendId}/remove_friend/`)
			return httpClient(endpoint, { method: "DELETE" })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["friends"] })
		},
	})
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { PlayerSummary } from "../types"

export function useMyFriends(playerId: number | undefined) {
	return useQuery({
		queryKey: ["friends", playerId],
		queryFn: async () => {
			const response = await fetch(`/api/players/${playerId}/friends`)
			if (!response.ok) throw new Error("Failed to fetch friends")
			return response.json() as Promise<PlayerSummary[]>
		},
		enabled: !!playerId,
	})
}

export function useAddFriend() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (friendId: number) => {
			const response = await fetch(`/api/players/${friendId}/add-friend`, {
				method: "POST",
			})
			if (!response.ok) throw new Error("Failed to add friend")
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["friends"] })
		},
	})
}

export function useRemoveFriend() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (friendId: number) => {
			const response = await fetch(`/api/players/${friendId}/remove-friend`, {
				method: "DELETE",
			})
			if (!response.ok) throw new Error("Failed to remove friend")
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["friends"] })
		},
	})
}

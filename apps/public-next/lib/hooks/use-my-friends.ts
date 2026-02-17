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

export function useAddFriend(playerId: number | undefined) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (friendId: number) => {
			const response = await fetch(`/api/players/${playerId}/add-friend`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ friend_id: friendId }),
			})
			if (!response.ok) throw new Error("Failed to add friend")
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["friends"] })
		},
	})
}

export function useRemoveFriend(playerId: number | undefined) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (friendId: number) => {
			const response = await fetch(`/api/players/${playerId}/remove-friend`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ friend_id: friendId }),
			})
			if (!response.ok) throw new Error("Failed to remove friend")
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["friends"] })
		},
	})
}

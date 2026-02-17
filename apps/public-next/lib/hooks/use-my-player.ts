import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "../auth-context"
import type { PlayerDetail } from "../types"

export function useMyPlayer() {
	const { user } = useAuth()
	const email = user?.email

	return useQuery({
		queryKey: ["my-player", email],
		queryFn: async () => {
			if (!email) throw new Error("Not authenticated")
			const response = await fetch(`/api/players/me?email=${encodeURIComponent(email)}`)
			if (!response.ok) throw new Error("Failed to fetch player")
			const data = (await response.json()) as PlayerDetail[]
			if (!data[0]) throw new Error("Player not found")
			return data[0]
		},
		enabled: !!email,
	})
}

export function useUpdateMyPlayer() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ id, data }: { id: number; data: unknown }) => {
			const response = await fetch(`/api/players/me?id=${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			})
			if (!response.ok) {
				const err = (await response.json()) as Record<string, unknown>
				throw new Error(JSON.stringify(err))
			}
			return response.json() as Promise<PlayerDetail>
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["my-player"] })
		},
	})
}

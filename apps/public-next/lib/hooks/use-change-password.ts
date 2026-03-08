import { useMutation } from "@tanstack/react-query"

interface ChangePasswordPayload {
	current_password: string
	new_password: string
	re_new_password: string
}

export function useChangePassword() {
	return useMutation({
		mutationFn: async (data: ChangePasswordPayload) => {
			const response = await fetch("/api/auth/change-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			})
			if (!response.ok) {
				const err = (await response.json()) as Record<string, unknown>
				throw new Error(JSON.stringify(err))
			}
		},
	})
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

export function useUploadPhoto() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (formData: FormData) => {
			const response = await fetch("/api/photos/upload", {
				method: "POST",
				body: formData,
			})
			if (!response.ok) throw new Error("Failed to upload photo")
			return response.json() as Promise<unknown>
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["my-player"] })
		},
	})
}

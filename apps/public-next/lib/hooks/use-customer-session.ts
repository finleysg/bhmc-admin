import { useQuery } from "@tanstack/react-query"

export function useCustomerSession(enabled: boolean) {
	return useQuery({
		queryKey: ["customer-session"],
		queryFn: async () => {
			const response = await fetch("/api/payments/customer-session", { method: "POST" })
			if (!response.ok) throw new Error("Failed to create customer session")
			const data = (await response.json()) as { clientSecret: string }
			return data.clientSecret
		},
		enabled,
		staleTime: 10 * 60 * 1000,
	})
}

import { useQuery } from "@tanstack/react-query"

import type { StripeAmountResponse } from "../registration/types"

export function useStripeAmount(paymentId: number) {
	return useQuery({
		queryKey: ["stripe-amount", paymentId],
		queryFn: async () => {
			const response = await fetch(`/api/payments/${paymentId}/stripe-amount`)
			if (!response.ok) {
				throw new Error("Failed to fetch payment amount")
			}
			return response.json() as Promise<StripeAmountResponse>
		},
		enabled: paymentId > 0,
		staleTime: Infinity,
	})
}

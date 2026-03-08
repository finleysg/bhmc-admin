import { useQuery } from "@tanstack/react-query"

export type PaymentAmount = {
	subtotal: number
	transactionFee: number
	total: number
}

export type StripeAmount = {
	amountDue: PaymentAmount
	amountCents: number
}

export function useStripeAmount(paymentId: number) {
	return useQuery({
		queryKey: ["stripe-amount", paymentId],
		queryFn: async () => {
			const response = await fetch(`/api/payments/${paymentId}/stripe-amount`)
			if (!response.ok) throw new Error("Failed to fetch stripe amount")
			return response.json() as Promise<StripeAmount>
		},
		enabled: paymentId > 0,
	})
}

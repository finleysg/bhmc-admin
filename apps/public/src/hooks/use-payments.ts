import { useQuery } from "@tanstack/react-query"

import { httpClient } from "../utils/api-client"
import { apiUrl, serverUrl } from "../utils/api-utils"
import { StripeAmount } from "../models/payment"

const stripeAmountMapper = (data: unknown) => data as StripeAmount
const clientSecretMapper = (data: { client_secret: string }) => data.client_secret

export function usePaymentAmount(paymentId: number) {
	const endpoint = serverUrl(`payments/${paymentId}/stripe-amount/`)
	return useQuery({
		queryKey: [endpoint],
		queryFn: () => httpClient(endpoint),
		staleTime: 0,
		select: stripeAmountMapper,
	})
}

export function useCustomerSession() {
	const endpoint = apiUrl("payments/customer_session/")
	return useQuery({
		queryKey: [endpoint],
		queryFn: () => httpClient(endpoint, { method: "POST", body: JSON.stringify({}) }),
		staleTime: 0,
		select: clientSecretMapper,
	})
}

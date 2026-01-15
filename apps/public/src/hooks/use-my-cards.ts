import { PaymentMethod } from "@stripe/stripe-js"
import { useQuery } from "@tanstack/react-query"

import { SavedCard } from "../models/saved-card"
import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

const transformPaymentMethods = (data: PaymentMethod[]) => {
	return data.map((pm) => new SavedCard(pm))
}

export function useMyCards() {
	return useQuery({
		queryKey: ["my-cards"],
		queryFn: () => httpClient(apiUrl("saved-cards")),
		select: transformPaymentMethods,
	})
}

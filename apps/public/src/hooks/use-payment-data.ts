import { useQuery } from "@tanstack/react-query"

import { PaymentApiSchema, PaymentData } from "../models/payment"
import { getMany } from "../utils/api-client"

export function usePaymentData(eventId: number) {
	const endpoint = `payments/?event=${eventId}`
	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany<PaymentData>(endpoint, PaymentApiSchema),
	})
}

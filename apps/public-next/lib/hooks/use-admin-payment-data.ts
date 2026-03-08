import { useQuery } from "@tanstack/react-query"

export interface AdminPaymentData {
	paymentId: number
	registrationId: number
	eventId: number
	eventName: string
	eventDate: string
}

export function useAdminPaymentData(paymentId: number, registrationId: number) {
	return useQuery({
		queryKey: ["admin-payment", paymentId, registrationId],
		queryFn: async () => {
			const response = await fetch(`/api/payments/${paymentId}/admin-payment/${registrationId}`)
			if (!response.ok) {
				const body = (await response.json()) as { message?: string }
				throw new Error(body.message ?? "Failed to load payment details")
			}
			return response.json() as Promise<AdminPaymentData>
		},
		enabled: paymentId > 0 && registrationId > 0,
	})
}

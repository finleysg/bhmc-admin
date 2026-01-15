import { useQuery } from "@tanstack/react-query"

import { ClubEvent, ClubEventApiSchema, ClubEventData } from "../models/club-event"
import { Payment, PaymentApiSchema, PaymentData } from "../models/payment"
import { Registration, RegistrationApiSchema, RegistrationData } from "../models/registration"
import { getOne } from "../utils/api-client"
import { useAuth } from "./use-auth"

interface AdminPaymentValidation {
	payment: Payment | null
	registration: Registration | null
	clubEvent: ClubEvent | null
	isLoading: boolean
	error: Error | null
	validationError: string | null
}

function validatePayment(
	userId: number | undefined,
	payment: Payment | null,
	registration: Registration | null,
): string | null {
	if (!payment) {
		return "Payment not found."
	}

	if (payment.userId !== userId) {
		return "This payment is not associated with your account."
	}

	if (payment.paymentCode.toLowerCase() !== "requested") {
		return "This payment has already been processed or is not available."
	}

	if (payment.confirmed) {
		return "This payment has already been confirmed."
	}

	if (!registration) {
		return "Registration not found."
	}

	if (new Date(registration.expires) <= new Date()) {
		return "This registration has expired. Please contact an administrator."
	}

	return null
}

export function useAdminPaymentData(
	registrationId: number,
	paymentId: number,
): AdminPaymentValidation {
	const { user } = useAuth()

	const {
		data: paymentData,
		isLoading: paymentLoading,
		error: paymentError,
	} = useQuery({
		queryKey: ["payment", paymentId],
		queryFn: () => getOne<PaymentData>(`payments/${paymentId}/`, PaymentApiSchema),
		enabled: paymentId > 0,
	})

	const {
		data: registrationData,
		isLoading: registrationLoading,
		error: registrationError,
	} = useQuery({
		queryKey: ["registration", registrationId],
		queryFn: () =>
			getOne<RegistrationData>(`registration/${registrationId}/`, RegistrationApiSchema),
		enabled: registrationId > 0,
	})

	const eventId = registrationData?.event ?? null
	const {
		data: eventData,
		isLoading: eventLoading,
		error: eventError,
	} = useQuery({
		queryKey: ["club-events", eventId],
		queryFn: () => getOne<ClubEventData>(`events/${eventId}`, ClubEventApiSchema),
		enabled: eventId !== null,
	})

	const isLoading = paymentLoading || registrationLoading || eventLoading
	const error = paymentError ?? registrationError ?? eventError ?? null

	const payment = paymentData ? new Payment(paymentData) : null
	const registration = registrationData ? new Registration(registrationData) : null
	const clubEvent = eventData ? new ClubEvent(eventData) : null

	const validationError = isLoading ? null : validatePayment(user?.id, payment, registration)

	return {
		payment,
		registration,
		clubEvent,
		isLoading,
		error: error as Error | null,
		validationError,
	}
}

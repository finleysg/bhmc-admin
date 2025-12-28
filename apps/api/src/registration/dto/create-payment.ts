/**
 * Request model for creating a payment record.
 */
export interface PaymentDetail {
	eventFeeId: number
	registrationSlotId: number
	amount: number
}

export interface CreatePayment {
	eventId: number
	userId: number
	notificationType?: string | null
	paymentDetails: PaymentDetail[]
}

export interface UpdatePayment {
	eventId: number
	userId: number
	notificationType?: string | null
	paymentDetails: PaymentDetail[]
}

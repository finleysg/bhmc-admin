/**
 * Detail for a single payment item.
 */
export class PaymentDetail {
	eventFeeId!: number
	registrationSlotId!: number
	amount!: number
}

/**
 * Request model for creating a payment record.
 */
export class CreatePayment {
	eventId!: number
	userId!: number
	notificationType?: string | null
	paymentDetails!: PaymentDetail[]
}

/**
 * Request model for updating a payment record.
 */
export class UpdatePayment {
	eventId!: number
	userId!: number
	notificationType?: string | null
	paymentDetails!: PaymentDetail[]
}

export interface PaymentIntentMetadata {
	eventId: number
	registrationId: number
	paymentId: number
	userName: string
	userEmail: string
	eventName: string
	eventStartDate: string
}

export interface PaymentIntentResult {
	paymentIntentId: string
	clientSecret: string
}

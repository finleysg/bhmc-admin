/**
 * Request model for canceling a registration.
 */
export class CancelRegistration {
	reason!: string
	paymentId?: number | null
}

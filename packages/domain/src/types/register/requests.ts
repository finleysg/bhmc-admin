import { NotificationTypeValue } from "./choices"

/**
 * Request model for creating a registration: aka "reserve".
 */
export interface ReserveRequest {
	eventId: number
	courseId?: number | null
	slotIds: number[]
}

/**
 * Request model for adding or removing a player from a registration slot.
 * This action is part of the signup process.
 */
export interface UpdateSlotPlayerRequest {
	playerId: number | null
}

/**
 * Request model for canceling a registration.
 */
export interface CancelRegistrationRequest {
	reason: string
	paymentId?: number | null
}

/**
 * Request model for creating a Stripe PaymentIntent.
 */
export interface CreatePaymentIntentRequest {
	eventId: number
	registrationId: number
}

/**
 * Detail for a single payment item.
 */
export interface PaymentDetailRequest {
	eventFeeId: number
	registrationSlotId: number
	amount: number
}

/**
 * Request model for creating a payment record.
 */
export interface CreatePaymentRequest {
	eventId: number
	userId: number
	notificationType?: NotificationTypeValue | null
	paymentDetails: PaymentDetailRequest[]
}

/**
 * Request model for updating a payment record.
 */
export interface UpdatePaymentRequest {
	eventId: number
	userId: number
	notificationType?: NotificationTypeValue | null
	paymentDetails: PaymentDetailRequest[]
}

/**
 * Request model for updating registration notes.
 */
export interface UpdateNotesRequest {
	notes: string | null
}

/**
 * Request model for adding players to a registration group.
 */
export interface AddPlayersRequest {
	players: { id: number }[]
}

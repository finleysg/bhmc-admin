import { EventFee } from "../events/event-fee"

export interface RegistrationFee {
	id: number
	registrationSlotId: number
	paymentId: number
	amount: number
	isPaid: boolean
	eventFeeId: number
	eventFee?: EventFee
}

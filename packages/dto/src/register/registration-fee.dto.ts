import { EventFeeDto } from "../events/event-fee.dto"

export interface RegistrationFeeDto {
	id: number
	registrationSlotId: number
	paymentId: number
	amount: string
	isPaid: number
	eventFeeId: number
	eventFee?: EventFeeDto
}

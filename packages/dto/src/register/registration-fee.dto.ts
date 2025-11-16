import { EventFeeDto } from "../events/event-fee.dto"

export interface RegistrationFeeDto {
	id: number
	isPaid: number
	paymentId: number
	amount: string
	eventFee: EventFeeDto
}

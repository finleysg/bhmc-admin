import { RegistrationSlot } from "./registration-slot"

export interface AvailableSlotGroup {
	holeId: number
	holeNumber: number
	startingOrder: number
	slots: RegistrationSlot[]
}

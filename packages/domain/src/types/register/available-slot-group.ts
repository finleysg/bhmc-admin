import { RegistrationSlot } from './registration-slot';

export interface AvailableSlotGroup {
	holeId: number;
	startingOrder: number;
	slots: RegistrationSlot[];
}

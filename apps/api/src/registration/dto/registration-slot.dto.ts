export interface RegistrationSlotDto {
	id?: number
	startingOrder: number
	slot: number
	status: string
	eventId: number
	holeId?: number | null
	playerId?: number | null
	registrationId?: number | null
	ggId?: string | null
}

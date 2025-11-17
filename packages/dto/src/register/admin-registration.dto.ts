export interface AddAdminRegistrationDto {
	paymentCode?: string | null
	requestPayment: boolean
	userId: number
	signedUpBy: string
	notes?: string | null
	slots: AddAdminRegistrationSlotsDto[]
}

export interface AddAdminRegistrationSlotsDto {
	playerId: number
	slotId?: number | null
	eventFeeIds: number[]
}

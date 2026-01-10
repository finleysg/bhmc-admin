export interface AdminRegistration {
	userId: number
	signedUpBy: string
	courseId?: number | null
	startingHoleId: number
	startingOrder: number
	expires: number
	notes?: string | null
	collectPayment: boolean
	slots: AdminRegistrationSlot[]
}

export interface AdminRegistrationSlot {
	slotId: number
	playerId: number
	feeIds: number[]
}

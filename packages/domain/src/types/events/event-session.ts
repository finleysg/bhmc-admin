export interface EventSession {
	id: number
	eventId: number
	name: string
	registrationLimit: number
	displayOrder: number
}

export interface EventSessionFee {
	id: number
	sessionId: number
	eventFeeId: number
	amount: number
}

export interface EventSessionWithFees extends EventSession {
	feeOverrides: EventSessionFee[]
}

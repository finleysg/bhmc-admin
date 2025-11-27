export const RegistrationStatus = {
	AVAILABLE: "A",
	PENDING: "P",
	RESERVED: "R",
	AWAITING_PAYMENT: "X",
	UNAVAILABLE: "U",
} as const

export type RegistrationStatusValue = (typeof RegistrationStatus)[keyof typeof RegistrationStatus]

export const RegistrationStatusChoices = {
	AVAILABLE: "A",
	PENDING: "P",
	RESERVED: "R",
	AWAITING_PAYMENT: "X",
	UNAVAILABLE: "U",
} as const

export const NotificationTypeChoices = {
	ADMIN: "A",
	NEW_MEMBER: "N",
	RETURNING_MEMBER: "R",
	SIGNUP_CONFIRMATION: "C",
	MATCH_PLAY: "M",
	UPDATED_REGISTRATION: "U",
} as const

export type RegistrationStatusValue =
	(typeof RegistrationStatusChoices)[keyof typeof RegistrationStatusChoices]
export type NotificationTypeValue =
	(typeof NotificationTypeChoices)[keyof typeof NotificationTypeChoices]

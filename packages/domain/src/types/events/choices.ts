export const FeeRestrictionChoices = {
	MEMBERS: "Members",
	RETURNING_MEMBERS: "Returning Members",
	NEW_MEMBERS: "New Members",
	SENIORS: "Seniors",
	NON_SENIORS: "Non-Seniors",
	NON_MEMBERS: "Non-Members",
	NONE: "None",
} as const

export const EventTypeChoices = {
	WEEKNIGHT: "N",
	WEEKEND_MAJOR: "W",
	MEETING: "M",
	OTHER: "O",
	EXTERNAL: "E",
	SEASON_REGISTRATION: "R",
	DEADLINE: "D",
	OPEN: "P",
	MATCH_PLAY: "S",
} as const

export const StartTypeChoices = {
	TEETIMES: "TT",
	SHOTGUN: "SG",
	NONE: "NA",
} as const

export const SkinTypeChoices = {
	INDIVIDUAL: "I",
	TEAM: "T",
	NONE: "N",
} as const

export const EventStatusChoices = {
	CANCELED: "C",
	SCHEDULED: "S",
	TENTATIVE: "T",
} as const

export const RegistrationTypeChoices = {
	MEMBER: "M",
	MEMBER_GUEST: "G",
	OPEN: "O",
	RETURNING_MEMBER: "R",
	NONE: "N",
} as const

export const AgeRestrictionTypeChoices = {
	OVER: "O",
	UNDER: "U",
	NONE: "N",
} as const

export const PayoutTypeChoices = {
	CASH: "Cash",
	CREDIT: "Credit",
	PASSTHRU: "Passthru",
	NONE: "None",
} as const

export const PayoutChoices = {
	INDIVIDUAL: "Individual",
	TEAM: "Team",
} as const

export const PayoutStatusChoices = {
	PENDING: "Pending",
	CONFIRMED: "Confirmed",
	PAID: "Paid",
} as const

export const TournamentFormatChoices = {
	SKINS: "skins",
	STABLEFORD: "stableford",
	STROKE: "stroke",
	TEAM: "team",
	QUOTA: "quota",
	USER_SCORED: "user_scored",
	OTHER: "other",
} as const

export type FeeRestrictionValue = (typeof FeeRestrictionChoices)[keyof typeof FeeRestrictionChoices]
export type EventTypeValue = (typeof EventTypeChoices)[keyof typeof EventTypeChoices]
export type StartTypeValue = (typeof StartTypeChoices)[keyof typeof StartTypeChoices]
export type SkinTypeValue = (typeof SkinTypeChoices)[keyof typeof SkinTypeChoices]
export type EventStatusValue = (typeof EventStatusChoices)[keyof typeof EventStatusChoices]
export type RegistrationTypeValue =
	(typeof RegistrationTypeChoices)[keyof typeof RegistrationTypeChoices]
export type AgeRestrictionTypeValue =
	(typeof AgeRestrictionTypeChoices)[keyof typeof AgeRestrictionTypeChoices]
export type PayoutTypeValue = (typeof PayoutTypeChoices)[keyof typeof PayoutTypeChoices]
export type PayoutValue = (typeof PayoutChoices)[keyof typeof PayoutChoices]
export type PayoutStatusValue = (typeof PayoutStatusChoices)[keyof typeof PayoutStatusChoices]
export type TournamentFormatValue =
	(typeof TournamentFormatChoices)[keyof typeof TournamentFormatChoices]

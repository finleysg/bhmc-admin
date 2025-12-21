import type { FeeRestrictionValue, PayoutTypeValue } from "./choices"

export interface FeeType {
	id: number
	name: string
	code: string
	payout: PayoutTypeValue
	restriction: FeeRestrictionValue
}

export interface EventFee {
	id: number
	eventId: number
	amount: number
	isRequired: boolean
	displayOrder: number
	feeType?: FeeType
	feeTypeId: number
	overrideAmount?: number | null
	overrideRestriction?: FeeRestrictionValue | null
}

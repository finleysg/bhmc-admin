export interface EventFeeDto {
	id: number
	eventId: number
	amount: string
	isRequired: number
	displayOrder: number
	feeType?: FeeTypeDto
	feeTypeId: number
	overrideAmount?: string | null
	overrideRestriction?: string | null
}

export interface FeeTypeDto {
	id: number
	name: string
	code: string
	payout: string
	restriction: string
}

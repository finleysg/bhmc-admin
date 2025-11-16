export interface EventFeeDto {
	id: number
	amount: string
	isRequired: number
	displayOrder: number
	feeType: FeeTypeDto
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

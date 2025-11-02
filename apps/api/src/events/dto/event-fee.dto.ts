export interface EventFeeDto {
	id?: number
	amount: string
	isRequired: number
	displayOrder: number
	eventId: number
	feeTypeId: number
	overrideAmount?: string | null
	overrideRestriction?: string | null
}

export interface FeeTypeDto {
	id?: number
	name: string
	code: string
	restriction: string
}

export interface EventFeeWithTypeDto {
	eventFee: EventFeeDto
	feeType: FeeTypeDto
}

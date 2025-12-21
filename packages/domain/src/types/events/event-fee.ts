import { Transform, Type } from "class-transformer"
import { IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator"
import type { FeeRestrictionValue, PayoutTypeValue } from "./choices"

export class FeeType {
	@IsNumber()
	id!: number

	@IsString()
	name!: string

	@IsString()
	code!: string

	@IsString()
	payout!: PayoutTypeValue

	@IsString()
	restriction!: FeeRestrictionValue
}

export class EventFee {
	@IsNumber()
	id!: number

	@IsNumber()
	eventId!: number

	@IsNumber()
	@Transform(({ value }: { value: unknown }) =>
		typeof value === "string" ? parseFloat(value) : value,
	)
	amount!: number

	@IsBoolean()
	isRequired!: boolean

	@IsNumber()
	displayOrder!: number

	@ValidateNested()
	@Type(() => FeeType)
	@IsOptional()
	feeType?: FeeType

	@IsNumber()
	feeTypeId!: number

	@IsOptional()
	@IsNumber()
	@Transform(({ value }: { value: unknown }) =>
		typeof value === "string" ? parseFloat(value) : value,
	)
	overrideAmount?: number | null

	@IsOptional()
	@IsString()
	overrideRestriction?: FeeRestrictionValue | null
}

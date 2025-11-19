import { Type } from "class-transformer"
import { IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator"

export class EventFee {
	@IsOptional()
	@IsNumber()
	id?: number

	@IsNumber()
	eventId!: number

	@IsNumber()
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
	overrideAmount?: number | null

	@IsOptional()
	@IsString()
	overrideRestriction?: string | null
}

export class FeeType {
	@IsOptional()
	@IsNumber()
	id?: number

	@IsString()
	name!: string

	@IsString()
	code!: string

	@IsString()
	payout!: string

	@IsString()
	restriction!: string
}

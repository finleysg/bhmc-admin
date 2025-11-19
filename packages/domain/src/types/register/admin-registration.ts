import { Type as TransformerType } from "class-transformer"
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator"

export class AddAdminRegistration {
	@IsOptional()
	@IsString()
	paymentCode?: string | null

	@IsBoolean()
	requestPayment!: boolean

	@IsNumber()
	userId!: number

	@IsString()
	signedUpBy!: string

	@IsOptional()
	@IsString()
	notes?: string | null

	@IsArray()
	@ValidateNested({ each: true })
	@TransformerType(() => AddAdminRegistrationSlot)
	slots!: AddAdminRegistrationSlot[]
}

export class AddAdminRegistrationSlot {
	@IsNumber()
	playerId!: number

	@IsOptional()
	@IsNumber()
	slotId?: number | null

	@IsArray()
	@IsNumber({}, { each: true })
	eventFeeIds!: number[]
}

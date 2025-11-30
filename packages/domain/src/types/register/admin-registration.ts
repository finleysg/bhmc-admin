import { Type as TransformerType } from "class-transformer"
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator"

export class AdminRegistration {
	@IsNumber()
	id!: number

	@IsNumber()
	userId!: number

	@IsString()
	signedUpBy!: string

	@IsOptional()
	@IsNumber()
	courseId?: number | null

	@IsNumber()
	startingHoleId!: number

	@IsNumber()
	startingOrder!: number

	@IsNumber()
	expires!: number

	@IsOptional()
	@IsString()
	notes?: string | null

	@IsBoolean()
	collectPayment!: boolean

	@IsArray()
	@ValidateNested({ each: true })
	@TransformerType(() => AdminRegistrationSlot)
	slots!: AdminRegistrationSlot[]
}

export class AdminRegistrationSlot {
	@IsNumber()
	registrationId!: number

	@IsNumber()
	slotId!: number

	@IsNumber()
	playerId!: number

	@IsArray()
	@IsNumber({}, { each: true })
	feeIds!: number[]
}

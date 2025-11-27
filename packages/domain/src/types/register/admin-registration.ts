import { Type as TransformerType } from "class-transformer"
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator"

import { EventFee } from "../events/event-fee"

export class AdminRegistration {
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
	@ValidateNested({ each: true })
	@TransformerType(() => EventFee)
	fees!: EventFee[]
}

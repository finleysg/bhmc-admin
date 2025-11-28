import { Transform, Type as TransformerType } from "class-transformer"
import { IsBoolean, IsNumber, IsOptional, ValidateNested } from "class-validator"

import { EventFee } from "../events/event-fee"

export class RegistrationFee {
	@IsOptional()
	@IsNumber()
	id?: number

	@IsNumber()
	registrationSlotId!: number

	@IsNumber()
	paymentId!: number

	@IsNumber()
	@Transform(({ value }: { value: unknown }) =>
		typeof value === "string" ? parseFloat(value) : value,
	)
	amount!: number

	@IsBoolean()
	isPaid!: boolean

	@IsNumber()
	eventFeeId!: number

	@ValidateNested()
	@TransformerType(() => EventFee)
	@IsOptional()
	eventFee?: EventFee
}

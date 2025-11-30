import { Transform } from "class-transformer"
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from "class-validator"

export class Payment {
	@IsOptional()
	@IsNumber()
	id?: number

	@IsString()
	paymentCode!: string

	@IsOptional()
	@IsString()
	paymentKey?: string | null

	@IsOptional()
	@IsString()
	notificationType?: string | null

	@IsBoolean()
	confirmed!: boolean

	@IsNumber()
	eventId!: number

	@IsNumber()
	userId!: number

	@IsNumber()
	@Transform(({ value }: { value: unknown }) =>
		typeof value === "string" ? parseFloat(value) : value,
	)
	paymentAmount!: number

	@IsNumber()
	@Transform(({ value }: { value: unknown }) =>
		typeof value === "string" ? parseFloat(value) : value,
	)
	transactionFee!: number

	@IsDateString()
	paymentDate!: string

	@IsOptional()
	@IsDateString()
	confirmDate?: string | null
}

export class AmountDue {
	@IsNumber()
	subtotal!: number

	@IsNumber()
	transactionFee!: number

	@IsNumber()
	total!: number
}

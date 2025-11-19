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
	paymentAmount!: number

	@IsNumber()
	transactionFee!: number

	@IsDateString()
	paymentDate!: string

	@IsOptional()
	@IsDateString()
	confirmDate?: string | null
}

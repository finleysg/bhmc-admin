import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from "class-validator"

export class Refund {
	@IsOptional()
	@IsNumber()
	id?: number

	@IsString()
	refundCode!: string

	@IsNumber()
	refundAmount!: number

	@IsOptional()
	@IsString()
	notes?: string | null

	@IsBoolean()
	confirmed!: boolean

	@IsOptional()
	@IsDateString()
	refundDate?: string | null

	@IsNumber()
	issuerId!: number

	@IsNumber()
	paymentId!: number
}

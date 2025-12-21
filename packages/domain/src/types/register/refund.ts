import { Transform } from "class-transformer"
import { IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from "class-validator"

export class Refund {
	@IsNumber()
	id!: number

	@IsString()
	refundCode!: string

	@IsNumber()
	@Transform(({ value }: { value: unknown }) =>
		typeof value === "string" ? parseFloat(value) : value,
	)
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

export class RefundRequest {
	@IsNumber()
	paymentId!: number

	@IsArray()
	@IsNumber({}, { each: true })
	registrationFeeIds!: number[]
}

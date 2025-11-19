import { IsDateString, IsNumber, IsOptional, IsString } from "class-validator"

export class Round {
	@IsOptional()
	@IsNumber()
	id?: number

	@IsNumber()
	eventId!: number

	@IsNumber()
	roundNumber!: number

	@IsDateString()
	roundDate!: string

	@IsOptional()
	@IsString()
	ggId?: string
}

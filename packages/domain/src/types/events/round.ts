import { IsDateString, IsNumber, IsString } from "class-validator"

export class Round {
	@IsNumber()
	id!: number

	@IsNumber()
	eventId!: number

	@IsNumber()
	roundNumber!: number

	@IsDateString()
	roundDate!: string

	@IsString()
	ggId!: string
}

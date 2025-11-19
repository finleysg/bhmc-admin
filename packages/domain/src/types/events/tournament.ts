import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator"

export class Tournament {
	@IsOptional()
	@IsNumber()
	id?: number

	@IsNumber()
	eventId!: number

	@IsNumber()
	roundId!: number

	@IsString()
	name!: string

	@IsString()
	format!: string

	@IsBoolean()
	isNet!: boolean

	@IsOptional()
	@IsString()
	ggId?: string
}

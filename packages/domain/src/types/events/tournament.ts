import { IsBoolean, IsNumber, IsString } from "class-validator"
import type { TournamentFormatValue } from "./choices"

export class Tournament {
	@IsNumber()
	id!: number

	@IsNumber()
	eventId!: number

	@IsNumber()
	roundId!: number

	@IsString()
	name!: string

	@IsString()
	format!: TournamentFormatValue

	@IsBoolean()
	isNet!: boolean

	@IsString()
	ggId!: string
}

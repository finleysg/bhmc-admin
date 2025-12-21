import { Type as TransformerType } from "class-transformer"
import { IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator"
import { Player } from "../register/player"

export class TournamentPoints {
	@IsNumber()
	id!: number

	@IsNumber()
	tournamentId!: number

	@IsNumber()
	playerId!: number

	@IsNumber()
	position!: number

	@IsOptional()
	@IsNumber()
	score?: number

	@IsNumber()
	points!: number

	@IsOptional()
	@IsString()
	details?: string

	@IsDateString()
	createDate!: string

	@ValidateNested()
	@TransformerType(() => Player)
	@IsOptional()
	player?: Player
}

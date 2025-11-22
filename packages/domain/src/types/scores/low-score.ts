import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from "class-validator"

import { Player } from "../register/player"

export class LowScore {
	@IsOptional()
	@IsNumber()
	id?: number

	@IsNumber()
	season!: number

	@IsString()
	@MaxLength(40)
	courseName!: string

	@IsNumber()
	score!: number

	@IsNumber()
	playerId!: number

	@IsBoolean()
	isNet!: boolean

	@IsOptional()
	player?: Player
}

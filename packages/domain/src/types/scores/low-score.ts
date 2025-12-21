import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from "class-validator"

import { Player } from "../register/player"

export class LowScore {
	@IsInt()
	id!: number

	@IsInt()
	season!: number

	@IsString()
	@MaxLength(40)
	courseName!: string

	@IsInt()
	score!: number

	@IsInt()
	playerId!: number

	@IsBoolean()
	isNet!: boolean

	@IsOptional()
	player?: Player
}

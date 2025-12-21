import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from "class-validator"

import { Player } from "../register/player"

export class Champion {
	@IsInt()
	id!: number

	@IsInt()
	season!: number

	@IsString()
	@MaxLength(60)
	eventName!: string

	@IsString()
	@MaxLength(30)
	flight!: string

	@IsInt()
	score!: number

	@IsInt()
	playerId!: number

	@IsBoolean()
	isNet!: boolean

	@IsOptional()
	@IsInt()
	eventId?: number

	@IsOptional()
	@IsString()
	@MaxLength(8)
	teamId?: string

	@IsOptional()
	player?: Player
}

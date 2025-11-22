import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"
import { createInsertSchema, createUpdateSchema } from "drizzle-zod"

import { champion, lowScore } from "../schema"
import { PlayerModel } from "./registration.models"

export const lowScoreInsertSchema = createInsertSchema(lowScore)
export const lowScoreUpdateSchema = createUpdateSchema(lowScore)

export class LowScoreModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsInt()
	season!: number

	@IsString()
	@MaxLength(40)
	courseName!: string

	@IsInt()
	@Min(0)
	score!: number

	@IsInt()
	playerId!: number

	@IsNumber()
	@Min(0)
	@Max(1)
	isNet!: number

	@IsOptional()
	player?: PlayerModel
}

export const championInsertSchema = createInsertSchema(champion)
export const championUpdateSchema = createUpdateSchema(champion)

export class ChampionModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsInt()
	season!: number

	@IsString()
	@MaxLength(60)
	eventName!: string

	@IsString()
	@MaxLength(30)
	flight!: string

	@IsInt()
	@Min(0)
	score!: number

	@IsInt()
	playerId!: number

	@IsNumber()
	@Min(0)
	@Max(1)
	isNet!: number

	@IsOptional()
	@IsInt()
	eventId?: number

	@IsOptional()
	@IsString()
	@MaxLength(8)
	teamId?: string

	@IsOptional()
	player?: PlayerModel
}

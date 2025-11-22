import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"
import { createInsertSchema, createUpdateSchema } from "drizzle-zod"

import { lowScore } from "../schema"
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

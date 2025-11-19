import { IsInt, IsNumber, IsOptional, Max, Min } from "class-validator"
import { createInsertSchema, createUpdateSchema } from "drizzle-zod"

import { eventScore, eventScorecard } from "../schema"

export const scorecardInsertSchema = createInsertSchema(eventScorecard)
export const scorecardUpdateSchema = createUpdateSchema(eventScorecard)
export const scoreInsertSchema = createInsertSchema(eventScore)
export const scoreUpdateSchema = createUpdateSchema(eventScore)

export class ScorecardModel {
	@IsInt()
	id?: number

	@IsOptional()
	handicapIndex?: number

	@IsInt()
	courseHandicap!: number

	@IsInt()
	eventId!: number

	@IsInt()
	playerId!: number

	@IsInt()
	@IsOptional()
	courseId?: number

	@IsInt()
	@IsOptional()
	teeId?: number
}

export class ScoreModel {
	@IsInt()
	id?: number

	@IsInt()
	score!: number

	@IsNumber()
	@Min(0)
	@Max(1)
	isNet!: number

	@IsInt()
	holeId!: number

	@IsInt()
	scorecardId!: number

	@IsInt()
	@IsOptional()
	eventId?: number

	@IsInt()
	@IsOptional()
	playerId?: number

	@IsInt()
	@IsOptional()
	courseId?: number

	@IsInt()
	@IsOptional()
	teeId?: number
}

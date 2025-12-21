import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from "class-validator"

import { Score } from "./score"

export class Scorecard {
	@IsInt()
	id!: number

	@IsString()
	@IsOptional()
	handicapIndex: string | null = null

	@IsInt()
	courseHandicap!: number

	@IsInt()
	courseId!: number

	@IsInt()
	eventId!: number

	@IsInt()
	playerId!: number

	@IsInt()
	teeId!: number

	@IsArray()
	@ValidateNested({ each: true })
	@IsOptional()
	scores?: Score[] = []
}

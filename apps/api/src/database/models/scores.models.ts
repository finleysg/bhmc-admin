import { IsInt, IsOptional, Max, Min } from "class-validator"

import { OmitType, PartialType } from "@nestjs/mapped-types"

export class ScorecardModel {
	@IsInt()
	id!: number

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
	id!: number

	@IsInt()
	score!: number

	@IsInt()
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

export class CreateScorecardModel extends OmitType(ScorecardModel, ["id"] as const) {}

export class UpdateScorecardModel extends PartialType(CreateScorecardModel) {}

export class CreateScoreModel extends OmitType(ScoreModel, [
	"id",
	"courseId",
	"eventId",
	"playerId",
	"teeId",
] as const) {}

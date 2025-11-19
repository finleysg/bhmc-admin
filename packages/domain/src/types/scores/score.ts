import { IsBoolean, IsInt, IsNumber, IsOptional } from "class-validator"

export class Score {
	@IsOptional()
	@IsNumber()
	id?: number

	@IsInt()
	scoreCardId!: number

	@IsInt()
	score!: number

	@IsBoolean()
	isNet!: boolean

	@IsInt()
	holeId!: number
}

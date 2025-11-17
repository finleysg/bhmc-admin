import {
	IsBoolean,
	IsInt,
} from "class-validator"

export class Score {
	@IsInt()
	id!: number

	@IsInt()
	scoreCardId!: number

	@IsInt()
	score!: number

	@IsBoolean()
	isNet!: boolean

	@IsInt()
	holeId!: number
}

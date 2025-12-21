import { IsInt } from "class-validator"

export class Hole {
	@IsInt()
	id!: number

	@IsInt()
	courseId!: number

	@IsInt()
	holeNumber!: number

	@IsInt()
	par!: number
}

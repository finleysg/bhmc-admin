import { IsInt, IsOptional } from "class-validator"

export class Hole {
	@IsOptional()
	@IsInt()
	id?: number

	@IsInt()
	courseId!: number

	@IsInt()
	holeNumber!: number

	@IsInt()
	par!: number
}

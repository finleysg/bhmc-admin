import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from "class-validator"

import { Hole } from "./hole"
import { Tee } from "./tee"

export class Course {
	@IsOptional()
	@IsInt()
	id?: number

	@IsString()
	name!: string

	@IsInt()
	numberOfHoles!: number

	@IsOptional()
	@IsString()
	ggId?: string | null

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	tees?: Tee[]

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	holes?: Hole[]
}

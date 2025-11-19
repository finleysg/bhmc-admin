import { IsInt, IsOptional, IsString, MaxLength } from "class-validator"
import { createInsertSchema, createUpdateSchema } from "drizzle-zod"

import { course, hole, tee } from "../schema"

export const courseInsertSchema = createInsertSchema(course)
export const courseUpdateSchema = createUpdateSchema(course)
export const holeInsertSchema = createInsertSchema(hole)
export const holeUpdateSchema = createUpdateSchema(hole)
export const teeInsertSchema = createInsertSchema(tee)
export const teeUpdateSchema = createUpdateSchema(tee)

export class CourseModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsString()
	@MaxLength(100)
	name!: string

	@IsInt()
	numberOfHoles!: number

	@IsOptional()
	@IsString()
	@MaxLength(22)
	ggId?: string

	@IsOptional()
	holes?: HoleModel[]

	@IsOptional()
	tees?: TeeModel[]
}

export class HoleModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsInt()
	holeNumber!: number

	@IsInt()
	par!: number

	@IsInt()
	courseId!: number
}

export class TeeModel {
	@IsInt()
	id!: number

	@IsString()
	@MaxLength(20)
	name!: string

	@IsOptional()
	@IsString()
	@MaxLength(22)
	ggId?: string

	@IsInt()
	courseId!: number
}

import { IsInt, IsOptional, IsString } from "class-validator"

export class Tee {
	@IsInt()
	id!: number

	@IsInt()
	courseId!: number

	@IsString()
	name!: string

	@IsOptional()
	@IsString()
	ggId?: string | null
}

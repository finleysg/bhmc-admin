import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator"

export class Player {
	@IsOptional()
	@IsNumber()
	id?: number

	@IsString()
	firstName!: string

	@IsString()
	lastName!: string

	@IsString()
	email!: string

	@IsOptional()
	@IsString()
	phoneNumber?: string | null

	@IsOptional()
	@IsString()
	ghin?: string | null

	@IsString()
	tee!: string

	@IsOptional()
	@IsString()
	birthDate?: string | null

	@IsBoolean()
	isMember!: boolean

	@IsOptional()
	@IsString()
	ggId?: string | null

	@IsOptional()
	@IsNumber()
	userId?: number | null
}

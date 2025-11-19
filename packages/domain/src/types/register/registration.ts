import { IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator"

import { Course } from "../courses/course"
import { RegistrationSlot } from "./registration-slot"

export class Registration {
	@IsOptional()
	@IsNumber()
	id?: number

	@IsNumber()
	eventId!: number

	@IsNumber()
	startingHole!: number

	@IsNumber()
	startingOrder!: number

	@IsOptional()
	@IsString()
	notes?: string | null

	@IsOptional()
	@IsNumber()
	courseId?: number | null

	@ValidateNested()
	@IsOptional()
	course?: Course

	@IsString()
	signedUpBy!: string

	@IsNumber()
	userId!: number

	@IsOptional()
	@IsDateString()
	expires?: string | null

	@IsOptional()
	@IsString()
	ggId?: string | null

	@IsDateString()
	createdDate!: string

	@IsOptional()
	@ValidateNested({ each: true })
	slots?: RegistrationSlot[]
}

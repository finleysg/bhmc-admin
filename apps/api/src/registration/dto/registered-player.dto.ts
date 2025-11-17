import {
	CourseDto,
	PlayerDto,
	RegistrationDto,
	RegistrationFeeDto,
	RegistrationSlotDto,
} from "@repo/dto"

export interface RegisteredPlayerDto {
	slot: RegistrationSlotDto
	player?: PlayerDto
	registration?: RegistrationDto
	course?: CourseDto
	fees?: RegistrationFeeDto[]
}

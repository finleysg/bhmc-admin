import {
	CourseDto,
	PlayerDto,
	RegistrationDto,
	RegistrationFeeDto,
	RegistrationSlotDto,
} from "@repo/domain/types"

export interface RegisteredPlayerDto {
	slot: RegistrationSlotDto
	player?: PlayerDto
	registration?: RegistrationDto
	course?: CourseDto
	fees?: RegistrationFeeDto[]
}

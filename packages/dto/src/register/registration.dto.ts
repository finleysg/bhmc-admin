import { CourseDto } from "../courses/course.dto"
import { RegistrationSlotDto } from "./registration-slot.dto"

export interface RegisteredGroupDto {
	id: number
	startingHole: number
	startingOrder: number
	notes?: string | null
	course?: CourseDto
	signedUpBy: string
	userId: number
	createdDate: string
	slots: RegistrationSlotDto[]
}

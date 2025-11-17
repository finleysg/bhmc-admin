import { CourseDto } from "../courses/course.dto"
import { RegistrationSlotDto } from "./registration-slot.dto"

export interface RegistrationDto {
	id: number
	eventId: number
	startingHole: number
	startingOrder: number
	notes?: string | null
	courseId?: number | null
	course?: CourseDto
	signedUpBy: string
	userId: number
	expires?: string | null
	ggId?: string | null
	createdDate: string
	slots?: RegistrationSlotDto[]
}

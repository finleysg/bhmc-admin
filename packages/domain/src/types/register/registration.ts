import { Course } from "../courses/course"
import { RegistrationSlot } from "./registration-slot"

export interface Registration {
	id: number
	eventId: number
	notes?: string | null
	courseId?: number | null
	course?: Course
	signedUpBy: string
	userId: number
	expires?: string | null
	ggId?: string | null
	createdDate: string
	slots?: RegistrationSlot[]
}

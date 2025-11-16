import { HoleDto } from "./hole.dto"

export interface CourseDto {
	id: number
	name: string
	holes: HoleDto[]
}

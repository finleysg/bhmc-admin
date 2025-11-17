import { HoleDto } from "./hole.dto"
import { TeeDto } from "./tee.dto"

export interface CourseDto {
	id: number
	name: string
	numberOfHoles: number
	ggId?: string | null
	tees?: TeeDto[]
	holes?: HoleDto[]
}

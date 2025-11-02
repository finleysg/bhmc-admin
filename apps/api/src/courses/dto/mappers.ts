import { CourseDto } from "./course.dto"
import { HoleDto } from "./hole.dto"
import { TeeDto } from "./tee.dto"

/**
 * Maps database entity to CourseDto
 */
export function mapToCourseDto(entity: Record<string, any>): CourseDto {
	return {
		id: entity.id,
		name: entity.name,
		numberOfHoles: entity.numberOfHoles,
		ggId: entity.ggId,
	}
}

/**
 * Maps CourseDto to database entity for insert/update
 */
export function mapCourseDtoToEntity(dto: CourseDto): Record<string, any> {
	return {
		name: dto.name,
		numberOfHoles: dto.numberOfHoles,
		ggId: dto.ggId,
	}
}

/**
 * Maps database entity to HoleDto
 */
export function mapToHoleDto(entity: Record<string, any>): HoleDto {
	return {
		id: entity.id,
		holeNumber: entity.holeNumber,
		par: entity.par,
		courseId: entity.courseId,
	}
}

/**
 * Maps HoleDto to database entity for insert/update
 */
export function mapHoleDtoToEntity(dto: HoleDto): Record<string, any> {
	return {
		holeNumber: dto.holeNumber,
		par: dto.par,
		courseId: dto.courseId,
	}
}

/**
 * Maps database entity to TeeDto
 */
export function mapToTeeDto(entity: Record<string, any>): TeeDto {
	return {
		id: entity.id,
		name: entity.name,
		ggId: entity.ggId,
		courseId: entity.courseId,
	}
}

/**
 * Maps TeeDto to database entity for insert/update
 */
export function mapTeeDtoToEntity(dto: TeeDto): Record<string, any> {
	return {
		name: dto.name,
		ggId: dto.ggId,
		courseId: dto.courseId,
	}
}

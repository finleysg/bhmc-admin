import { eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"
import { CourseDto, HoleDto, TeeDto } from "@repo/dto"

import { course, DrizzleService, eventCourses, hole, tee } from "../database"
import { mapToCourseDto, mapToHoleDto, mapToTeeDto } from "./dto/mappers"

@Injectable()
export class CoursesService {
	constructor(private drizzle: DrizzleService) {}

	// Courses
	async findCourseByGgId(gg_id: string): Promise<CourseDto | null> {
		const [c] = await this.drizzle.db.select().from(course).where(eq(course.ggId, gg_id)).limit(1)
		return c ? mapToCourseDto(c) : null
	}

	async findCoursesByEventId({
		eventId,
		includeHoles = false,
	}: {
		eventId: number
		includeHoles?: boolean
	}): Promise<CourseDto[]> {
		const courseData = await this.drizzle.db
			.select({
				course: course,
			})
			.from(eventCourses)
			.leftJoin(course, eq(eventCourses.courseId, course.id))
			.where(eq(eventCourses.eventId, eventId))

		const courses = courseData.map((c) => mapToCourseDto(c))

		if (includeHoles) {
			for (const dto of courses) {
				dto.holes = await this.findHolesByCourseId(dto.id)
			}
		}

		return courses
	}

	// Holes
	async findHolesByCourseId(course_id: number): Promise<HoleDto[]> {
		const holes = await this.drizzle.db.select().from(hole).where(eq(hole.courseId, course_id))
		return holes.map(mapToHoleDto)
	}

	// Tees
	async findTeeByGgId(ggId: string): Promise<TeeDto | null> {
		const [t] = await this.drizzle.db.select().from(tee).where(eq(tee.ggId, ggId)).limit(1)
		return t ? mapToTeeDto(t) : null
	}
}

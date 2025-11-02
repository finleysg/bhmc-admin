import { eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import { course, DrizzleService, hole, tee } from "../database"
import { CourseDto } from "./dto/course.dto"
import { HoleDto } from "./dto/hole.dto"
import { mapToCourseDto, mapToHoleDto, mapToTeeDto } from "./dto/mappers"
import { TeeDto } from "./dto/tee.dto"

@Injectable()
export class CoursesService {
	constructor(private drizzle: DrizzleService) {}

	// Courses
	async findCourseByGgId(gg_id: string): Promise<CourseDto | null> {
		const [c] = await this.drizzle.db.select().from(course).where(eq(course.ggId, gg_id)).limit(1)
		return c ? mapToCourseDto(c) : null
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

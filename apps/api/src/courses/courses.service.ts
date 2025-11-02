import { Injectable } from "@nestjs/common"
import { eq } from "drizzle-orm"

import { course, DrizzleService, hole, tee } from "../database"

@Injectable()
export class CoursesService {
	constructor(private drizzle: DrizzleService) {}

	// Courses
	async findCourseByGgId(gg_id: string) {
		const [c] = await this.drizzle.db.select().from(course).where(eq(course.ggId, gg_id)).limit(1)
		return c ?? null
	}

	// Holes
	async findHolesByCourseId(course_id: number) {
		return this.drizzle.db.select().from(hole).where(eq(hole.courseId, course_id))
	}

	// Tees
	async findTeeByGgId(ggId: string) {
		const [t] = await this.drizzle.db.select().from(tee).where(eq(tee.ggId, ggId)).limit(1)
		return t ?? null
	}
}

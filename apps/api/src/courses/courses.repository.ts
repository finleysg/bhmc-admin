import { eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import { course, DrizzleService, eventCourses, hole, tee } from "../database"
import { CourseModel, HoleModel, TeeModel } from "../database/models"
import { mapToCourseModel, mapToHoleModel, mapToTeeModel } from "./mappers"

@Injectable()
export class CoursesRepository {
	constructor(private drizzle: DrizzleService) {}

	// Courses
	async findCourseByGgId(gg_id: string): Promise<CourseModel | null> {
		const [c] = await this.drizzle.db.select().from(course).where(eq(course.ggId, gg_id)).limit(1)
		return c ? mapToCourseModel(c) : null
	}

	async findCoursesByEventId({
		eventId,
		includeHoles = false,
		includeTees = false,
	}: {
		eventId: number
		includeHoles?: boolean
		includeTees?: boolean
	}): Promise<CourseModel[]> {
		const courseData = await this.drizzle.db
			.select({
				course: course,
			})
			.from(eventCourses)
			.leftJoin(course, eq(eventCourses.courseId, course.id))
			.where(eq(eventCourses.eventId, eventId))

		const courses = courseData.map((c) => mapToCourseModel(c))

		if (includeHoles) {
			for (const course of courses) {
				course.holes = await this.findHolesByCourseId(course.id!)
			}
		}

		if (includeTees) {
			for (const course of courses) {
				course.tees = await this.findTeesByCourseId(course.id!)
			}
		}

		return courses
	}

	// Holes
	async findHolesByCourseId(courseId: number): Promise<HoleModel[]> {
		const holes = await this.drizzle.db.select().from(hole).where(eq(hole.courseId, courseId))
		return holes.map(mapToHoleModel)
	}

	// Tees
	async findTeesByCourseId(courseId: number): Promise<TeeModel[]> {
		const tees = await this.drizzle.db.select().from(tee).where(eq(tee.courseId, courseId))
		return tees.map(mapToTeeModel)
	}

	async findTeeByGgId(ggId: string): Promise<TeeModel | null> {
		const [t] = await this.drizzle.db.select().from(tee).where(eq(tee.ggId, ggId)).limit(1)
		return t ? mapToTeeModel(t) : null
	}
}

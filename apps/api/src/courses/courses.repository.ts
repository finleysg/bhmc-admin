import { and, eq } from "drizzle-orm"

import { Injectable, NotFoundException } from "@nestjs/common"

import {
	course,
	CourseFull,
	CourseWithHoles,
	DrizzleService,
	eventCourses,
	hole,
	tee,
	type CourseRow,
	type HoleRow,
	type TeeRow,
} from "../database"

@Injectable()
export class CoursesRepository {
	constructor(private drizzle: DrizzleService) {}

	// Courses
	async findCourseByGgId(ggId: string): Promise<CourseRow | null> {
		const [c] = await this.drizzle.db.select().from(course).where(eq(course.ggId, ggId)).limit(1)
		return c ?? null
	}

	async findCoursesByEventId(eventId: number): Promise<CourseRow[]> {
		const courseData = await this.drizzle.db
			.select({
				course: course,
			})
			.from(eventCourses)
			.leftJoin(course, eq(eventCourses.courseId, course.id))
			.where(eq(eventCourses.eventId, eventId))

		const courseRows = courseData
			.filter((c): c is { course: CourseRow } => c.course !== null)
			.map((c) => c.course)

		return courseRows
	}

	async findCourseFullById(courseId: number): Promise<CourseFull> {
		const results = await this.drizzle.db
			.select({
				course,
				tee,
				hole,
			})
			.from(course)
			.innerJoin(tee, eq(course.id, tee.courseId))
			.innerJoin(hole, eq(course.id, hole.courseId))
			.where(eq(course.id, courseId))

		if (results.length === 0) throw new NotFoundException(`No course found with id ${courseId}`)

		const courseRecord = results[0].course as CourseFull
		courseRecord.tees = results.map(r => r.tee)
		courseRecord.holes = results.map(r => r.hole)

		return courseRecord
	}

	async findCourseWithHolesById(courseId: number): Promise<CourseWithHoles> {
		const results = await this.drizzle.db
			.select({
				course,
				hole,
			})
			.from(course)
			.innerJoin(hole, eq(course.id, hole.courseId))
			.where(eq(course.id, courseId))

		if (results.length === 0) throw new NotFoundException(`No course found with id ${courseId}`)

		const courseRecord = results[0].course as CourseWithHoles
		courseRecord.holes = results.map(r => r.hole)

		return courseRecord
	}

	async findHoleRowsByCourseId(courseId: number): Promise<HoleRow[]> {
		return this.drizzle.db.select().from(hole).where(eq(hole.courseId, courseId))
	}

	async findTeeRowsByCourseId(courseId: number): Promise<TeeRow[]> {
		return this.drizzle.db.select().from(tee).where(eq(tee.courseId, courseId))
	}

	async findTeeRowByGgId(ggId: string): Promise<TeeRow | null> {
		const [t] = await this.drizzle.db.select().from(tee).where(eq(tee.ggId, ggId)).limit(1)
		return t ?? null
	}

	// Update methods
	async updateCourseGgId(courseId: number, ggId: string): Promise<void> {
		await this.drizzle.db.update(course).set({ ggId }).where(eq(course.id, courseId))
	}

	async upsertTee(courseId: number, name: string, ggId: string): Promise<void> {
		const [existing] = await this.drizzle.db
			.select()
			.from(tee)
			.where(and(eq(tee.courseId, courseId), eq(tee.name, name)))
			.limit(1)

		if (existing) {
			await this.drizzle.db.update(tee).set({ ggId }).where(eq(tee.id, existing.id))
		} else {
			await this.drizzle.db.insert(tee).values({ courseId, name, ggId })
		}
	}

	async upsertHole(courseId: number, holeNumber: number, par: number): Promise<void> {
		const [existing] = await this.drizzle.db
			.select()
			.from(hole)
			.where(and(eq(hole.courseId, courseId), eq(hole.holeNumber, holeNumber)))
			.limit(1)

		if (existing) {
			await this.drizzle.db.update(hole).set({ par }).where(eq(hole.id, existing.id))
		} else {
			await this.drizzle.db.insert(hole).values({ courseId, holeNumber, par })
		}
	}
}

import { and, eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"
import { Course, Hole, Tee } from "@repo/domain/types"

import {
	course,
	DrizzleService,
	eventCourses,
	hole,
	tee,
	type CourseRow,
	type HoleRow,
	type TeeRow,
} from "../database"
import { toCourse, toCourseWithCompositions, toHole, toTee } from "./mappers"

@Injectable()
export class CoursesRepository {
	constructor(private drizzle: DrizzleService) {}

	// Courses
	async findCourseByGgId(gg_id: string): Promise<Course | null> {
		const [c] = await this.drizzle.db.select().from(course).where(eq(course.ggId, gg_id)).limit(1)
		return c ? toCourse(c) : null
	}

	async findCoursesByEventId({
		eventId,
		includeHoles = false,
		includeTees = false,
	}: {
		eventId: number
		includeHoles?: boolean
		includeTees?: boolean
	}): Promise<Course[]> {
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

		const results: Course[] = []

		for (const courseRow of courseRows) {
			let holes: Hole[] = []
			let tees: Tee[] = []

			if (includeHoles) {
				holes = await this.findHolesByCourseId(courseRow.id)
			}

			if (includeTees) {
				tees = await this.findTeesByCourseId(courseRow.id)
			}

			results.push(toCourseWithCompositions(courseRow, { holes, tees }))
		}

		return results
	}

	// Holes
	async findHolesByCourseId(courseId: number): Promise<Hole[]> {
		const holes = await this.drizzle.db.select().from(hole).where(eq(hole.courseId, courseId))
		return holes.map(toHole)
	}

	async findHoleRowsByCourseId(courseId: number): Promise<HoleRow[]> {
		return this.drizzle.db.select().from(hole).where(eq(hole.courseId, courseId))
	}

	// Tees
	async findTeesByCourseId(courseId: number): Promise<Tee[]> {
		const tees = await this.drizzle.db.select().from(tee).where(eq(tee.courseId, courseId))
		return tees.map(toTee)
	}

	async findTeeRowsByCourseId(courseId: number): Promise<TeeRow[]> {
		return this.drizzle.db.select().from(tee).where(eq(tee.courseId, courseId))
	}

	async findTeeByGgId(ggId: string): Promise<Tee | null> {
		const [t] = await this.drizzle.db.select().from(tee).where(eq(tee.ggId, ggId)).limit(1)
		return t ? toTee(t) : null
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

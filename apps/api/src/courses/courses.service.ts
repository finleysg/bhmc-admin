import { Injectable } from "@nestjs/common"
import { CompleteCourse, Course, Hole, Tee } from "@repo/domain/types"

import { toCourse, toCourseWithCompositions, toCourseWithHoles, toHole, toTee } from "./mappers"
import { CoursesRepository } from "./courses.repository"
import { CourseWithHoles } from "../database"

@Injectable()
export class CoursesService {
	constructor(
		private repository: CoursesRepository,
	) {}

	async findCourseByGgId(gg_id: string): Promise<Course | null> {
		const course = await this.repository.findCourseByGgId(gg_id)
		return course ? toCourse(course) : null
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
		const courseRows = await this.repository.findCoursesByEventId(eventId)

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

	async findCourseWithHolesById(courseId: number): Promise<CourseWithHoles> {
		const course = await this.repository.findCourseFullById(courseId)
		return toCourseWithHoles(course)
	}

	async findHolesByCourseId(courseId: number): Promise<Hole[]> {
		const holes = await this.repository.findHoleRowsByCourseId(courseId)
		return holes.map(toHole)
	}

	async findTeesByCourseId(courseId: number): Promise<Tee[]> {
		const tees = await this.repository.findTeeRowsByCourseId(courseId)
		return tees.map(t => toTee(t))
	}

	async findTeeByGgId(ggId: string): Promise<Tee | null> {
		const tee = await this.repository.findTeeRowByGgId(ggId)
		return tee ? toTee(tee) : null
	}

	async updateCourseGgId(courseId: number, ggId: string): Promise<void> {
		await this.repository.updateCourseGgId(courseId, ggId)
	}

	async upsertTee(courseId: number, teeName: string, ggId: string): Promise<void> {
		await this.repository.upsertTee(courseId, teeName, ggId)
	}

	async upsertHole(courseId: number, holeNumber: number, par: number): Promise<void> {
		await this.repository.upsertHole(courseId, holeNumber, par)
	}
}

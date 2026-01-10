import { Course, Hole, Tee } from "@repo/domain/types"

import type { CourseRow, CourseWithHoles, HoleRow, TeeRow } from "../database"

/**
 * Maps CourseRow to Course domain type
 */
export function toCourse(row: CourseRow): Course {
	return {
		id: row.id,
		name: row.name,
		numberOfHoles: row.numberOfHoles,
		ggId: row.ggId,
		tees: [],
		holes: [],
	}
}

/**
 * Maps database course with holes to domain CourseWithHoles
 */
export function toCourseWithHoles(row: CourseWithHoles): CourseWithHoles {
	return {
		id: row.id,
		name: row.name,
		numberOfHoles: row.numberOfHoles,
		ggId: row.ggId,
		holes: row.holes,
	}
}

/**
 * Maps CourseRow with loaded compositions to Course
 */
export function toCourseWithCompositions(
	row: CourseRow,
	compositions: {
		tees?: Tee[]
		holes?: Hole[]
	},
): Course {
	return {
		...toCourse(row),
		tees: compositions.tees ?? [],
		holes: compositions.holes ?? [],
	}
}

/**
 * Maps TeeRow to Tee domain type
 */
export function toTee(row: TeeRow): Tee {
	return {
		id: row.id,
		name: row.name,
		ggId: row.ggId ?? undefined,
		courseId: row.courseId,
	}
}

/**
 * Maps HoleRow to Hole domain type
 */
export function toHole(row: HoleRow): Hole {
	return {
		id: row.id,
		holeNumber: row.holeNumber,
		par: row.par,
		courseId: row.courseId,
	}
}

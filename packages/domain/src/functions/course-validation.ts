import { Course, Hole, Tee } from "../types"

export const validateCourses = (courses: Course[]): boolean =>
	courses != null &&
	courses.every(
		(course) =>
			course.id != null &&
			course.holes != null &&
			course.holes.length > 0 &&
			course.holes.every((h) => h.id != null) &&
			course.tees != null &&
			course.tees.length > 0 &&
			course.tees.every((t) => t.id != null),
	)

export const validateCourse = (course?: Course): boolean =>
	course != null &&
	course.id != null &&
	course.holes != null &&
	course.holes.length > 0 &&
	course.holes.every((h) => h.id != null) &&
	course.tees != null &&
	course.tees.length > 0 &&
	course.tees.every((t) => t.id != null)

/**
 * When an event is a signup-only event, there will not be a course.
 * We will still add a course to avoid typescript shenanigans every time
 * we have to do work on courses and holes for can-choose events.
 * @returns Dummy Course object
 */
export const dummyCourse = (): Course => {
	return {
		id: -1,
		name: "dummy",
		numberOfHoles: 1,
		holes: [dummyHole()],
		tees: [dummyTee()],
	}
}

export const dummyHole = (): Hole => {
	return {
		id: -1,
		courseId: -1,
		holeNumber: -1,
		par: -1,
	}
}

export const dummyTee = (): Tee => {
	return {
		id: -1,
		courseId: -1,
		name: "dummy",
	}
}

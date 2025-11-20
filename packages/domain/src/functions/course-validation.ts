import { Course } from "../types"

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

import {
	validateCourses,
	validateCourse,
	dummyCourse,
	dummyHole,
	dummyTee,
} from "../functions/course-validation"
import type { Course, Hole, Tee } from "../types"

const createHole = (overrides: Partial<Hole> = {}): Hole => ({
	id: 1,
	courseId: 1,
	holeNumber: 1,
	par: 4,
	...overrides,
})

const createTee = (overrides: Partial<Tee> = {}): Tee => ({
	id: 1,
	courseId: 1,
	name: "White",
	...overrides,
})

const createCourse = (overrides: Partial<Course> = {}): Course => ({
	id: 1,
	name: "Test Course",
	numberOfHoles: 18,
	holes: [createHole()],
	tees: [createTee()],
	...overrides,
})

describe("validateCourse", () => {
	it("returns true for valid course", () => {
		const course = createCourse()
		expect(validateCourse(course)).toBe(true)
	})

	it("returns false for undefined course", () => {
		expect(validateCourse(undefined)).toBe(false)
	})

	it("returns false for null course", () => {
		expect(validateCourse(null as unknown as Course)).toBe(false)
	})

	it("returns false when course id is null", () => {
		const course = createCourse({ id: null as unknown as number })
		expect(validateCourse(course)).toBe(false)
	})

	it("returns false when holes is null", () => {
		const course = createCourse({ holes: null as unknown as Hole[] })
		expect(validateCourse(course)).toBe(false)
	})

	it("returns false when holes is empty", () => {
		const course = createCourse({ holes: [] })
		expect(validateCourse(course)).toBe(false)
	})

	it("returns false when a hole has null id", () => {
		const course = createCourse({
			holes: [createHole({ id: null as unknown as number })],
		})
		expect(validateCourse(course)).toBe(false)
	})

	it("returns false when tees is null", () => {
		const course = createCourse({ tees: null as unknown as Tee[] })
		expect(validateCourse(course)).toBe(false)
	})

	it("returns false when tees is empty", () => {
		const course = createCourse({ tees: [] })
		expect(validateCourse(course)).toBe(false)
	})

	it("returns false when a tee has null id", () => {
		const course = createCourse({
			tees: [createTee({ id: null as unknown as number })],
		})
		expect(validateCourse(course)).toBe(false)
	})

	it("returns true with multiple holes and tees", () => {
		const course = createCourse({
			holes: [
				createHole({ id: 1, holeNumber: 1 }),
				createHole({ id: 2, holeNumber: 2 }),
				createHole({ id: 3, holeNumber: 3 }),
			],
			tees: [createTee({ id: 1, name: "White" }), createTee({ id: 2, name: "Blue" })],
		})
		expect(validateCourse(course)).toBe(true)
	})
})

describe("validateCourses", () => {
	it("returns true for empty array", () => {
		expect(validateCourses([])).toBe(true)
	})

	it("returns true for array of valid courses", () => {
		const courses = [createCourse({ id: 1 }), createCourse({ id: 2 })]
		expect(validateCourses(courses)).toBe(true)
	})

	it("returns false for null", () => {
		expect(validateCourses(null as unknown as Course[])).toBe(false)
	})

	it("returns false if any course is invalid", () => {
		const courses = [createCourse({ id: 1 }), createCourse({ id: 2, holes: [] })]
		expect(validateCourses(courses)).toBe(false)
	})

	it("returns false if any course has null id", () => {
		const courses = [createCourse({ id: 1 }), createCourse({ id: null as unknown as number })]
		expect(validateCourses(courses)).toBe(false)
	})

	it("returns false if any course has hole with null id", () => {
		const courses = [
			createCourse({ id: 1 }),
			createCourse({
				id: 2,
				holes: [createHole({ id: null as unknown as number })],
			}),
		]
		expect(validateCourses(courses)).toBe(false)
	})
})

describe("dummyCourse", () => {
	it("returns a course with id -1", () => {
		const course = dummyCourse()
		expect(course.id).toBe(-1)
	})

	it("returns a course with name dummy", () => {
		const course = dummyCourse()
		expect(course.name).toBe("dummy")
	})

	it("returns a course with one hole", () => {
		const course = dummyCourse()
		expect(course.holes).toHaveLength(1)
	})

	it("returns a course with one tee", () => {
		const course = dummyCourse()
		expect(course.tees).toHaveLength(1)
	})

	it("contains a dummy hole", () => {
		const course = dummyCourse()
		expect(course.holes![0].id).toBe(-1)
	})

	it("contains a dummy tee", () => {
		const course = dummyCourse()
		expect(course.tees![0].id).toBe(-1)
	})
})

describe("dummyHole", () => {
	it("returns a hole with id -1", () => {
		const hole = dummyHole()
		expect(hole.id).toBe(-1)
	})

	it("returns a hole with courseId -1", () => {
		const hole = dummyHole()
		expect(hole.courseId).toBe(-1)
	})

	it("returns a hole with holeNumber -1", () => {
		const hole = dummyHole()
		expect(hole.holeNumber).toBe(-1)
	})

	it("returns a hole with par -1", () => {
		const hole = dummyHole()
		expect(hole.par).toBe(-1)
	})
})

describe("dummyTee", () => {
	it("returns a tee with id -1", () => {
		const tee = dummyTee()
		expect(tee.id).toBe(-1)
	})

	it("returns a tee with courseId -1", () => {
		const tee = dummyTee()
		expect(tee.courseId).toBe(-1)
	})

	it("returns a tee with name dummy", () => {
		const tee = dummyTee()
		expect(tee.name).toBe("dummy")
	})
})

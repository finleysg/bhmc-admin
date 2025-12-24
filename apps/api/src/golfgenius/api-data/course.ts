import { z } from "zod"

/**
 * Schema for Golf Genius hole data
 * Contains arrays of par, yardage, and handicap for each hole
 * Values are nullable for unused holes (e.g., holes 10-18 in 9-hole courses)
 */
export const GgHoleDataSchema = z
	.object({
		par: z.array(z.number().nullable()),
		yardage: z.array(z.number().nullable()),
		handicap: z.array(z.number().nullable()),
	})

/**
 * Schema for Golf Genius tee data
 * Validates id, name, abbreviation, and hole_data fields
 * Uses catchall to allow additional unvalidated properties
 */
export const GgTeeSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		abbreviation: z.string(),
		hole_data: GgHoleDataSchema,
	})

/**
 * Schema for Golf Genius course data
 * Validates id, name, abbreviation, and tees array
 * Uses catchall to allow additional unvalidated properties
 */
export const GgCourseSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		abbreviation: z.string(),
		tees: z.array(GgTeeSchema),
	})

/**
 * Schema for Golf Genius courses API response
 * The API returns an array of courses wrapped in a "courses" property
 */
export const GgCoursesResponseSchema = z.object({
	courses: z.array(GgCourseSchema),
})

export type GgHoleData = z.infer<typeof GgHoleDataSchema>
export type GgTee = z.infer<typeof GgTeeSchema>
export type GgCourse = z.infer<typeof GgCourseSchema>
export type GgCoursesResponse = z.infer<typeof GgCoursesResponseSchema>

import { z } from "zod"

export const HoleApiSchema = z.object({
	id: z.number(),
	course: z.number().optional(),
	hole_number: z.number(),
	par: z.number(),
})

export const CourseApiSchema = z.object({
	id: z.number(),
	name: z.string(),
	number_of_holes: z.number(),
	holes: z.array(HoleApiSchema),
})

export type HoleData = z.infer<typeof HoleApiSchema>
export type CourseData = z.infer<typeof CourseApiSchema>

export class Hole {
	id: number
	holeNumber: number
	par: number

	constructor(data: HoleData) {
		this.id = data.id
		this.holeNumber = data.hole_number
		this.par = data.par
	}
}

export class Course {
	id: number
	name: string
	numberOfHoles: number
	holes: Hole[]

	constructor(data: CourseData) {
		this.id = data.id
		this.name = data.name
		this.numberOfHoles = data.number_of_holes
		this.holes = data.holes?.map((h) => new Hole(h)) ?? []
	}
}

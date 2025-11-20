// Type intersections ensuring required fields for validated objects in CompleteClubEvent

import { Course } from "./course"
import { Hole } from "./hole"
import { Tee } from "./tee"

export type ValidatedHole = Hole & { id: number }

export type ValidatedTee = Tee & { id: number }

export type ValidatedCourse = Course & {
	id: number
	holes: ValidatedHole[]
	tees: ValidatedTee[]
}

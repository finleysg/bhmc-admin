import { relations } from "drizzle-orm/relations"

import { course, hole, tee } from "../schema/courses.schema"

export const courseRelations = relations(course, ({ many }) => ({
	holes: many(hole),
	tees: many(tee),
}))

export const holeRelations = relations(hole, ({ one }) => ({
	course: one(course, {
		fields: [hole.courseId],
		references: [course.id],
	}),
}))

export const teeRelations = relations(tee, ({ one }) => ({
	course: one(course, {
		fields: [tee.courseId],
		references: [course.id],
	}),
}))

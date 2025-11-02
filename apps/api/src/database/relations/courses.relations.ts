import { relations } from "drizzle-orm/relations"

import { course, hole, tee } from "../schema/courses.schema"

export const coursesCourseRelations = relations(course, ({ many }) => ({
	coursesHoles: many(hole),
	coursesTees: many(tee),
}))

export const coursesHoleRelations = relations(hole, ({ one }) => ({
	coursesCourse: one(course, {
		fields: [hole.courseId],
		references: [course.id],
	}),
}))

export const coursesTeeRelations = relations(tee, ({ one }) => ({
	coursesCourse: one(course, {
		fields: [tee.courseId],
		references: [course.id],
	}),
}))

import { relations } from "drizzle-orm"

import { course, event, eventScore, eventScorecard, hole, player, tee } from "../schema"

export const eventScorecardRelations = relations(eventScorecard, ({ one, many }) => ({
	event: one(event, {
		fields: [eventScorecard.eventId],
		references: [event.id],
	}),
	player: one(player, {
		fields: [eventScorecard.playerId],
		references: [player.id],
	}),
	course: one(course, {
		fields: [eventScorecard.courseId],
		references: [course.id],
	}),
	tee: one(tee, {
		fields: [eventScorecard.teeId],
		references: [tee.id],
	}),
	scores: many(eventScore),
}))

export const eventScoreRelations = relations(eventScore, ({ one }) => ({
	event: one(event, {
		fields: [eventScore.eventId],
		references: [event.id],
	}),
	hole: one(hole, {
		fields: [eventScore.holeId],
		references: [hole.id],
	}),
	player: one(player, {
		fields: [eventScore.playerId],
		references: [player.id],
	}),
	course: one(course, {
		fields: [eventScore.courseId],
		references: [course.id],
	}),
	tee: one(tee, {
		fields: [eventScore.teeId],
		references: [tee.id],
	}),
	scorecard: one(eventScorecard, {
		fields: [eventScore.scorecardId],
		references: [eventScorecard.id],
	}),
}))

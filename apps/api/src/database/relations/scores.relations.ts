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
	hole: one(hole, {
		fields: [eventScore.holeId],
		references: [hole.id],
	}),
	scorecard: one(eventScorecard, {
		fields: [eventScore.scorecardId],
		references: [eventScorecard.id],
	}),
}))

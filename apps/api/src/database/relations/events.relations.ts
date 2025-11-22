import { relations } from "drizzle-orm/relations"

import {
	course,
	event,
	eventCourses,
	eventFee,
	eventScorecard,
	feeType,
	payment,
	player,
	registration,
	registrationFee,
	registrationSlot,
	round,
	tournament,
	tournamentPoints,
	tournamentResult,
} from "../schema"
import { champion } from "../schema/core.schema"
import { integrationLog } from "../schema/golf-genius.schema"

export const eventRelations = relations(event, ({ many }) => ({
	champions: many(champion),
	// coreSeasonsettings_matchPlayEventId: many(coreSeasonsettings, {
	// 	relationName: "coreSeasonsettings_matchPlayEventId_eventsEvent_id",
	// }),
	// coreSeasonsettings_memberEventId: many(coreSeasonsettings, {
	// 	relationName: "coreSeasonsettings_memberEventId_eventsEvent_id",
	// }),
	// damcupScores: many(damcupScores),
	// damcupSeasonlongpoints: many(damcupSeasonlongpoints),
	// documentsDocuments: many(documentsDocument),
	// contentTag: one(contentTag, {
	// 	fields: [event.defaultTagId],
	// 	references: [contentTag.id],
	// }),
	eventCourses: many(eventCourses),
	eventfees: many(eventFee),
	eventsRounds: many(round),
	eventsTournaments: many(tournament),
	integrationLogs: many(integrationLog),
	// messagingAnnouncements: many(messagingAnnouncement),
	payments: many(payment),
	// pointsPlayerpoints: many(pointsPlayerpoints),
	registrations: many(registration),
	registrationslots: many(registrationSlot),
	scoreCards: many(eventScorecard),
}))

export const eventCoursesRelations = relations(eventCourses, ({ one }) => ({
	course: one(course, {
		fields: [eventCourses.courseId],
		references: [course.id],
	}),
	event: one(event, {
		fields: [eventCourses.eventId],
		references: [event.id],
	}),
}))

export const eventfeeRelations = relations(eventFee, ({ one, many }) => ({
	event: one(event, {
		fields: [eventFee.eventId],
		references: [event.id],
	}),
	eventsFeetype: one(feeType, {
		fields: [eventFee.feeTypeId],
		references: [feeType.id],
	}),
	registrationfees: many(registrationFee),
}))

export const feetypeRelations = relations(feeType, ({ many }) => ({
	eventfees: many(eventFee),
}))

export const roundRelations = relations(round, ({ one, many }) => ({
	event: one(event, {
		fields: [round.eventId],
		references: [event.id],
	}),
	tournaments: many(tournament),
}))

export const tournamentRelations = relations(tournament, ({ one, many }) => ({
	event: one(event, {
		fields: [tournament.eventId],
		references: [event.id],
	}),
	round: one(round, {
		fields: [tournament.roundId],
		references: [round.id],
	}),
	tournamentResults: many(tournamentResult),
}))

export const tournamentResultRelations = relations(tournamentResult, ({ one }) => ({
	player: one(player, {
		fields: [tournamentResult.playerId],
		references: [player.id],
	}),
	tournament: one(tournament, {
		fields: [tournamentResult.tournamentId],
		references: [tournament.id],
	}),
}))

export const tournamentPointsRelations = relations(tournamentPoints, ({ one }) => ({
	player: one(player, {
		fields: [tournamentPoints.playerId],
		references: [player.id],
	}),
	tournament: one(tournament, {
		fields: [tournamentPoints.tournamentId],
		references: [tournament.id],
	}),
}))

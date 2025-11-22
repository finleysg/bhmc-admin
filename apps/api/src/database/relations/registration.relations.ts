import { relations } from "drizzle-orm/relations"

import { authUser } from "../schema/auth.schema"
import {
	champion,
	lowScore,
} from "../schema/core.schema"
import {
	course,
	hole,
} from "../schema/courses.schema"
import {
	event,
	eventFee,
} from "../schema/events.schema"
import {
	payment,
	player,
	playerFavorites,
	registration,
	registrationFee,
	registrationSlot,
} from "../schema/registration.schema"

export const playerRelations = relations(player, ({ one, many }) => ({
	playerFavorites_fromPlayerId: many(playerFavorites, {
		relationName: "playerFavorites_fromPlayerId_player_id",
	}),
	playerFavorites_toPlayerId: many(playerFavorites, {
		relationName: "playerFavorites_toPlayerId_player_id",
	}),
	registrationslots: many(registrationSlot),
	champions: many(champion),
	lowScores: many(lowScore),
	authUser: one(authUser, {
		fields: [player.userId],
		references: [authUser.id],
	}),
}))

export const playerFavoritesRelations = relations(playerFavorites, ({ one }) => ({
	player_fromPlayerId: one(player, {
		fields: [playerFavorites.fromPlayerId],
		references: [player.id],
		relationName: "playerFavorites_fromPlayerId_player_id",
	}),
	player_toPlayerId: one(player, {
		fields: [playerFavorites.toPlayerId],
		references: [player.id],
		relationName: "playerFavorites_toPlayerId_player_id",
	}),
}))

export const registrationRelations = relations(registration, ({ one, many }) => ({
	course: one(course, {
		fields: [registration.courseId],
		references: [course.id],
	}),
	event: one(event, {
		fields: [registration.eventId],
		references: [event.id],
	}),
	authUser: one(authUser, {
		fields: [registration.userId],
		references: [authUser.id],
	}),
	registrationslots: many(registrationSlot),
}))

export const registrationFeeRelations = relations(registrationFee, ({ one }) => ({
	eventFee: one(eventFee, {
		fields: [registrationFee.eventFeeId],
		references: [eventFee.id],
	}),
	payment: one(payment, {
		fields: [registrationFee.paymentId],
		references: [payment.id],
	}),
	registrationslot: one(registrationSlot, {
		fields: [registrationFee.registrationSlotId],
		references: [registrationSlot.id],
	}),
}))

export const registrationSlotRelations = relations(registrationSlot, ({ one, many }) => ({
	registrationfees: many(registrationFee),
	event: one(event, {
		fields: [registrationSlot.eventId],
		references: [event.id],
	}),
	hole: one(hole, {
		fields: [registrationSlot.holeId],
		references: [hole.id],
	}),
	player: one(player, {
		fields: [registrationSlot.playerId],
		references: [player.id],
	}),
	registration: one(registration, {
		fields: [registrationSlot.registrationId],
		references: [registration.id],
	}),
}))

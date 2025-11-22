import { relations } from "drizzle-orm/relations"

import { champion, lowScore } from "../schema/core.schema"
import { event } from "../schema/events.schema"
import { player } from "../schema/registration.schema"

export const lowScoreRelations = relations(lowScore, ({ one }) => ({
	player: one(player, {
		fields: [lowScore.playerId],
		references: [player.id],
	}),
}))

export const championRelations = relations(champion, ({ one }) => ({
	player: one(player, {
		fields: [champion.playerId],
		references: [player.id],
	}),
	event: one(event, {
		fields: [champion.eventId],
		references: [event.id],
	}),
}))

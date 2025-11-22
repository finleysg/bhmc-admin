import { relations } from "drizzle-orm/relations"

import { lowScore } from "../schema/core.schema"
import { player } from "../schema/registration.schema"

export const lowScoreRelations = relations(lowScore, ({ one }) => ({
	player: one(player, {
		fields: [lowScore.playerId],
		references: [player.id],
	}),
}))

import { relations } from "drizzle-orm/relations"

import { event } from "../schema"
import { integrationLog } from "../schema/golf-genius.schema"

export const integrationLogRelations = relations(integrationLog, ({ one }) => ({
	log: one(event, {
		fields: [integrationLog.eventId],
		references: [event.id],
	}),
}))

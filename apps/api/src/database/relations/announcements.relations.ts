import { relations } from "drizzle-orm"

import { announcement, announcementDocuments, document } from "../schema/announcements.schema"
import { event } from "../schema/events.schema"

export const announcementRelations = relations(announcement, ({ one, many }) => ({
	event: one(event, { fields: [announcement.eventId], references: [event.id] }),
	announcementDocuments: many(announcementDocuments),
}))

export const announcementDocumentsRelations = relations(announcementDocuments, ({ one }) => ({
	announcement: one(announcement, {
		fields: [announcementDocuments.announcementId],
		references: [announcement.id],
	}),
	document: one(document, {
		fields: [announcementDocuments.documentId],
		references: [document.id],
	}),
}))

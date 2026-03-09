import { datetime, int, longtext, mysqlTable, primaryKey, varchar } from "drizzle-orm/mysql-core"

import { event } from "./events.schema"

export const announcement = mysqlTable(
	"messaging_announcement",
	{
		id: int().autoincrement().notNull(),
		title: varchar({ length: 200 }).notNull(),
		text: longtext().notNull(),
		starts: datetime({ mode: "string", fsp: 6 }).notNull(),
		expires: datetime({ mode: "string", fsp: 6 }).notNull(),
		visibility: varchar({ length: 1 }).notNull(),
		eventId: int("event_id").references(() => event.id),
	},
	(table) => [primaryKey({ columns: [table.id], name: "messaging_announcement_id" })],
)

export const announcementDocuments = mysqlTable(
	"messaging_announcement_documents",
	{
		id: int().autoincrement().notNull(),
		announcementId: int("announcement_id")
			.notNull()
			.references(() => announcement.id),
		documentId: int("document_id")
			.notNull()
			.references(() => document.id),
	},
	(table) => [primaryKey({ columns: [table.id], name: "messaging_announcement_documents_id" })],
)

export const document = mysqlTable(
	"documents_document",
	{
		id: int().autoincrement().notNull(),
		year: int(),
		title: varchar({ length: 120 }).notNull(),
		documentType: varchar("document_type", { length: 1 }).notNull(),
		file: varchar({ length: 100 }),
		createdBy: varchar("created_by", { length: 100 }).notNull(),
		lastUpdate: datetime("last_update", { mode: "string", fsp: 6 }).notNull(),
		eventId: int("event_id").references(() => event.id),
	},
	(table) => [primaryKey({ columns: [table.id], name: "documents_document_id" })],
)

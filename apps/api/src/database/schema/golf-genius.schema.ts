import {
	datetime,
	int,
	longtext,
	mysqlTable,
	primaryKey,
	tinyint,
	varchar,
} from "drizzle-orm/mysql-core"

import { event } from "./events.schema"

export const integrationLog = mysqlTable(
	"core_golfgeniusintegrationlog",
	{
		id: int().autoincrement().notNull(),
		actionName: varchar("action_name", { length: 20 }).notNull(),
		actionDate: datetime("action_date", { mode: "string", fsp: 6 }).notNull(),
		details: longtext(),
		eventId: int("event_id")
			.notNull()
			.references(() => event.id)
			.notNull(),
		isSuccessful: tinyint("is_successful").notNull(),
	},
	(table) => [primaryKey({ columns: [table.id], name: "core_golfgeniusintegrationlog_id" })],
)

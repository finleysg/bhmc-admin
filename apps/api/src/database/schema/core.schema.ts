import {
	int,
	mysqlTable,
	primaryKey,
	tinyint,
	varchar,
} from "drizzle-orm/mysql-core"

import { event } from "./events.schema"
import { player } from "./registration.schema"

export const lowScore = mysqlTable(
	"core_lowscore",
	{
		id: int("id").autoincrement().notNull(),
		season: int("season").notNull(),
		courseName: varchar("course_name", { length: 40 }).notNull(),
		score: int("score").notNull(),
		playerId: int("player_id")
			.notNull()
			.references(() => player.id),
		isNet: tinyint("is_net").notNull(),
	},
	(table) => [primaryKey({ columns: [table.id] })],
)

export const champion = mysqlTable(
	"core_majorchampion",
	{
		id: int("id").autoincrement().notNull(),
		season: int("season").notNull(),
		eventName: varchar("event_name", { length: 60 }).notNull(),
		flight: varchar("flight", { length: 30 }).notNull(),
		score: int("score").notNull(),
		playerId: int("player_id")
			.notNull()
			.references(() => player.id),
		isNet: tinyint("is_net").notNull(),
		eventId: int("event_id").references(() => event.id),
		teamId: varchar("team_id", { length: 8 }),
	},
	(table) => [primaryKey({ columns: [table.id] })],
)

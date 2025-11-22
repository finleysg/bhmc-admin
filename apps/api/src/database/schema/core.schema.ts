import { int, mysqlTable, primaryKey, tinyint, varchar } from "drizzle-orm/mysql-core"

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

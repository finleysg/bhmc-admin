import { decimal, int, mysqlTable, primaryKey, unique } from "drizzle-orm/mysql-core"

import { course, hole, tee } from "./courses.schema"
import { event } from "./events.schema"
import { player } from "./registration.schema"

export const eventScorecard = mysqlTable(
	"scores_eventscorecard",
	{
		id: int().autoincrement().notNull(),
		handicapIndex: decimal("handicap_index", { precision: 3, scale: 1 }),
		courseHandicap: int("course_handicap").notNull(),
		courseId: int("course_id").references(() => course.id),
		eventId: int("event_id")
			.notNull()
			.references(() => event.id),
		playerId: int("player_id")
			.notNull()
			.references(() => player.id),
		teeId: int("tee_id").references(() => tee.id),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "scores_eventscorecard_id" }),
		unique("unique_event_scorecard").on(table.eventId, table.playerId),
	],
)

export const eventScore = mysqlTable(
	"scores_eventscore",
	{
		id: int().autoincrement().notNull(),
		score: int("score").notNull(),
		isNet: int("is_net").notNull().default(0),
		holeId: int("hole_id")
			.notNull()
			.references(() => hole.id),
		scorecardId: int("scorecard_id")
			.notNull()
			.references(() => eventScorecard.id),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "scores_eventscore_id" }),
		unique("unique_event_score").on(table.scorecardId, table.holeId, table.isNet),
	],
)

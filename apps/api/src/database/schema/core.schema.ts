import {
	datetime,
	index,
	int,
	json,
	mysqlTable,
	primaryKey,
	tinyint,
	unique,
	varchar,
} from "drizzle-orm/mysql-core"

import { authUser } from "./auth.schema"

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

/** One administrative change (Django model core.AdminAuditEntry). Insert-only. */
export const adminAuditEntry = mysqlTable(
	"core_adminauditentry",
	{
		id: int().autoincrement().notNull(),
		createdAt: datetime("created_at", { mode: "string", fsp: 6 }).notNull(),
		actorId: int("actor_id")
			.notNull()
			.references(() => authUser.id),
		client: varchar({ length: 3 }).notNull(),
		operation: varchar({ length: 60 }).notNull(),
		entityType: varchar("entity_type", { length: 30 }).notNull(),
		entityId: int("entity_id").notNull(),
		eventId: int("event_id").references(() => event.id),
		changes: json().notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "core_adminauditentry_id" }),
		index("audit_entity_idx").on(table.entityType, table.entityId),
		index("audit_created_idx").on(table.createdAt),
	],
)

/** An operational setting (Django model core.AdminSetting). Keys and defaults live in src/settings. */
export const adminSetting = mysqlTable(
	"core_adminsetting",
	{
		id: int().autoincrement().notNull(),
		key: varchar({ length: 60 }).notNull(),
		value: json().notNull(),
		updatedById: int("updated_by_id")
			.notNull()
			.references(() => authUser.id),
		updatedAt: datetime("updated_at", { mode: "string", fsp: 6 }).notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "core_adminsetting_id" }),
		unique("key").on(table.key),
	],
)

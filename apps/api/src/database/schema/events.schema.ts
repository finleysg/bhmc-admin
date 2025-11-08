import {
	date,
	datetime,
	decimal,
	int,
	longtext,
	mysqlTable,
	primaryKey,
	tinyint,
	unique,
	varchar,
} from "drizzle-orm/mysql-core"

import { course } from "./courses.schema"
import { player } from "./registration.schema"

export const event = mysqlTable(
	"events_event",
	{
		id: int().autoincrement().notNull(),
		eventType: varchar("event_type", { length: 1 }).notNull(),
		name: varchar({ length: 100 }).notNull(),
		rounds: int(),
		registrationType: varchar("registration_type", { length: 1 }).notNull(),
		skinsType: varchar("skins_type", { length: 1 }),
		minimumSignupGroupSize: int("minimum_signup_group_size"),
		maximumSignupGroupSize: int("maximum_signup_group_size"),
		groupSize: int("group_size"),
		totalGroups: int("total_groups"),
		startType: varchar("start_type", { length: 2 }),
		canChoose: tinyint("can_choose").notNull(),
		ghinRequired: tinyint("ghin_required").notNull(),
		seasonPoints: int("season_points"),
		notes: longtext(),
		startDate: date("start_date", { mode: "string" }).notNull(),
		startTime: varchar("start_time", { length: 40 }),
		signupStart: datetime("signup_start", { mode: "string", fsp: 6 }),
		signupEnd: datetime("signup_end", { mode: "string", fsp: 6 }),
		paymentsEnd: datetime("payments_end", { mode: "string", fsp: 6 }),
		registrationMaximum: int("registration_maximum"),
		portalUrl: varchar("portal_url", { length: 240 }),
		externalUrl: varchar("external_url", { length: 255 }),
		status: varchar({ length: 1 }).notNull(),
		season: int().notNull(),
		teeTimeSplits: varchar("tee_time_splits", { length: 10 }),
		// defaultTagId: int("default_tag_id").references(() => contentTag.id),
		starterTimeInterval: int("starter_time_interval").notNull(),
		teamSize: int("team_size").notNull(),
		prioritySignupStart: datetime("priority_signup_start", { mode: "string", fsp: 6 }),
		ageRestriction: int("age_restriction"),
		ageRestrictionType: varchar("age_restriction_type", { length: 1 }).notNull(),
		ggId: varchar("gg_id", { length: 22 }),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "events_event_id" }),
		unique("unique_name_startdate").on(table.name, table.startDate),
	],
)

export const eventCourses = mysqlTable(
	"events_event_courses",
	{
		id: int().autoincrement().notNull(),
		eventId: int("event_id")
			.notNull()
			.references(() => event.id),
		courseId: int("course_id")
			.notNull()
			.references(() => course.id),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "events_event_courses_id" }),
		unique("events_event_courses_event_id_course_id_23d4ede3_uniq").on(
			table.eventId,
			table.courseId,
		),
	],
)

export const eventFee = mysqlTable(
	"events_eventfee",
	{
		id: int().autoincrement().notNull(),
		amount: decimal({ precision: 5, scale: 2 }).notNull(),
		isRequired: tinyint("is_required").notNull(),
		displayOrder: int("display_order").notNull(),
		eventId: int("event_id")
			.notNull()
			.references(() => event.id),
		feeTypeId: int("fee_type_id")
			.notNull()
			.references(() => feeType.id),
		overrideAmount: decimal("override_amount", { precision: 5, scale: 2 }),
		overrideRestriction: varchar("override_restriction", { length: 20 }),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "events_eventfee_id" }),
		unique("unique_event_feetype").on(table.eventId, table.feeTypeId),
	],
)

export const eventFeeOverride = mysqlTable(
	"events_eventfeeoverride",
	{
		id: int().autoincrement().notNull(),
		amount: decimal({ precision: 5, scale: 2 }).notNull(),
		restriction: varchar({ length: 20 }).notNull(),
	},
	(table) => [primaryKey({ columns: [table.id], name: "events_eventfeeoverride_id" })],
)

export const feeType = mysqlTable(
	"events_feetype",
	{
		id: int().autoincrement().notNull(),
		name: varchar({ length: 30 }).notNull(),
		code: varchar({ length: 3 }).notNull(),
		restriction: varchar({ length: 20 }).notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "events_feetype_id" }),
		unique("name").on(table.name),
	],
)

export const round = mysqlTable(
	"events_round",
	{
		id: int().autoincrement().notNull(),
		roundNumber: int("round_number").notNull(),
		// you can use { mode: 'date' }, if you want to have Date as type for this column
		roundDate: date("round_date", { mode: "string" }).notNull(),
		ggId: varchar("gg_id", { length: 22 }).notNull(),
		eventId: int("event_id")
			.notNull()
			.references(() => event.id),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "events_round_id" }),
		unique("unique_event_roundnumber").on(table.eventId, table.roundNumber),
	],
)

export const tournament = mysqlTable(
	"events_tournament",
	{
		id: int().autoincrement().notNull(),
		name: varchar({ length: 120 }).notNull(),
		format: varchar({ length: 20 }),
		isNet: tinyint("is_net").notNull(),
		ggId: varchar("gg_id", { length: 22 }).notNull(),
		eventId: int("event_id")
			.notNull()
			.references(() => event.id),
		roundId: int("round_id")
			.notNull()
			.references(() => round.id),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "events_tournament_id" }),
		unique("unique_event_tournamentname").on(table.eventId, table.name),
	],
)

export const tournamentResult = mysqlTable(
	"events_tournamentresult",
	{
		id: int().autoincrement().notNull(),
		flight: varchar({ length: 20 }),
		position: int().notNull(),
		score: int(),
		amount: decimal({ precision: 6, scale: 2 }).notNull(),
		details: varchar({ length: 120 }),
		playerId: int("player_id")
			.notNull()
			.references(() => player.id),
		tournamentId: int("tournament_id")
			.notNull()
			.references(() => tournament.id),
		teamId: varchar("team_id", { length: 22 }),
		createDate: datetime("create_date", { mode: "string", fsp: 6 }),
		payoutDate: datetime("payout_date", { mode: "string", fsp: 6 }),
		payoutStatus: varchar("payout_status", { length: 10 }),
		payoutTo: varchar("payout_to", { length: 10 }),
		payoutType: varchar("payout_type", { length: 10 }),
		summary: varchar({ length: 40 }),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "events_tournamentresult_id" }),
		unique("unique_tournament_player").on(table.tournamentId, table.playerId),
	],
)

export const tournamentPoints = mysqlTable(
	"events_tournamentpoints",
	{
		id: int().autoincrement().notNull(),
		position: int().notNull(),
		score: int(),
		points: int().notNull(),
		createDate: datetime("create_date", { mode: "string", fsp: 6 }).notNull(),
		details: varchar({ length: 120 }),
		tournamentId: int("tournament_id")
			.notNull()
			.references(() => tournament.id),
		playerId: int("player_id")
			.notNull()
			.references(() => player.id),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "events_tournamentpoints_id" }),
		unique("unique_points").on(table.tournamentId, table.playerId),
	],
)

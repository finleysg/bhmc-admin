import {
	date,
	datetime,
	decimal,
	index,
	int,
	longtext,
	mysqlTable,
	primaryKey,
	tinyint,
	unique,
	varchar,
} from "drizzle-orm/mysql-core"

import { authUser } from "./auth.schema"
import { course, hole } from "./courses.schema"
import { event, eventFee } from "./events.schema"

export const payment = mysqlTable(
	"payments_payment",
	{
		id: int().autoincrement().notNull(),
		paymentCode: varchar("payment_code", { length: 40 }).notNull(),
		paymentKey: varchar("payment_key", { length: 100 }),
		notificationType: varchar("notification_type", { length: 1 }),
		confirmed: tinyint().notNull(),
		eventId: int("event_id")
			.notNull()
			.references(() => event.id),
		userId: int("user_id")
			.notNull()
			.references(() => authUser.id),
		paymentAmount: decimal("payment_amount", { precision: 5, scale: 2 }).notNull(),
		transactionFee: decimal("transaction_fee", { precision: 4, scale: 2 }).notNull(),
		paymentDate: datetime("payment_date", { mode: "string", fsp: 6 }),
		confirmDate: datetime("confirm_date", { mode: "string", fsp: 6 }),
	},
	(table) => [primaryKey({ columns: [table.id], name: "payments_payment_id" })],
)

export const refund = mysqlTable(
	"payments_refund",
	{
		id: int().autoincrement().notNull(),
		refundCode: varchar("refund_code", { length: 40 }).notNull(),
		refundAmount: decimal("refund_amount", { precision: 5, scale: 2 }).notNull(),
		notes: longtext(),
		confirmed: tinyint().notNull(),
		refundDate: datetime("refund_date", { mode: "string", fsp: 6 }),
		issuerId: int("issuer_id")
			.notNull()
			.references(() => authUser.id),
		paymentId: int("payment_id")
			.notNull()
			.references(() => payment.id),
	},
	(table) => [primaryKey({ columns: [table.id], name: "payments_refund_id" })],
)

export const player = mysqlTable(
	"register_player",
	{
		id: int().autoincrement().notNull(),
		firstName: varchar("first_name", { length: 30 }).notNull(),
		lastName: varchar("last_name", { length: 30 }).notNull(),
		email: varchar({ length: 200 }).notNull(),
		phoneNumber: varchar("phone_number", { length: 20 }),
		ghin: varchar({ length: 8 }),
		tee: varchar({ length: 8 }).notNull(),
		birthDate: date("birth_date", { mode: "string" }),
		saveLastCard: tinyint("save_last_card").notNull(),
		stripeCustomerId: varchar("stripe_customer_id", { length: 40 }),
		profilePictureId: int("profile_picture_id"),
		isMember: tinyint("is_member").notNull(),
		lastSeason: int("last_season"),
		ggId: varchar("gg_id", { length: 22 }),
		userId: int("user_id").references(() => authUser.id),
	},
	(table) => [
		index("register_player_profile_picture_id_9c81c697_fk_documents").on(table.profilePictureId),
		primaryKey({ columns: [table.id], name: "register_player_id" }),
		unique("email").on(table.email),
		unique("ghin").on(table.ghin),
	],
)

export const playerFavorites = mysqlTable(
	"register_player_favorites",
	{
		id: int().autoincrement().notNull(),
		fromPlayerId: int("from_player_id")
			.notNull()
			.references(() => player.id),
		toPlayerId: int("to_player_id")
			.notNull()
			.references(() => player.id),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "register_player_favorites_id" }),
		unique("register_player_favorite_from_player_id_to_player_ee8a4118_uniq").on(
			table.fromPlayerId,
			table.toPlayerId,
		),
	],
)

export const registration = mysqlTable(
	"register_registration",
	{
		id: int().autoincrement().notNull(),
		expires: datetime({ mode: "string", fsp: 6 }),
		startingHole: int("starting_hole").notNull(),
		startingOrder: int("starting_order").notNull(),
		notes: longtext(),
		courseId: int("course_id").references(() => course.id),
		eventId: int("event_id")
			.notNull()
			.references(() => event.id),
		signedUpBy: varchar("signed_up_by", { length: 40 }),
		userId: int("user_id").references(() => authUser.id),
		createdDate: datetime("created_date", { mode: "string", fsp: 6 }).notNull(),
		ggId: varchar("gg_id", { length: 22 }),
	},
	(table) => [primaryKey({ columns: [table.id], name: "register_registration_id" })],
)

export const registrationFee = mysqlTable(
	"register_registrationfee",
	{
		id: int().autoincrement().notNull(),
		isPaid: tinyint("is_paid").notNull(),
		eventFeeId: int("event_fee_id")
			.notNull()
			.references(() => eventFee.id),
		paymentId: int("payment_id")
			.notNull()
			.references(() => payment.id),
		registrationSlotId: int("registration_slot_id").references(() => registrationSlot.id),
		amount: decimal({ precision: 5, scale: 2 }).notNull(),
	},
	(table) => [primaryKey({ columns: [table.id], name: "register_registrationfee_id" })],
)

export const registrationSlot = mysqlTable(
	"register_registrationslot",
	{
		id: int().autoincrement().notNull(),
		startingOrder: int("starting_order").notNull(),
		slot: int().notNull(),
		status: varchar({ length: 1 }).notNull(),
		eventId: int("event_id")
			.notNull()
			.references(() => event.id),
		holeId: int("hole_id").references(() => hole.id),
		playerId: int("player_id").references(() => player.id),
		registrationId: int("registration_id").references(() => registration.id),
		ggId: varchar("gg_id", { length: 22 }),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "register_registrationslot_id" }),
		unique("unique_player_registration").on(table.eventId, table.playerId),
	],
)

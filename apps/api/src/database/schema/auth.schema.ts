import {
	datetime,
	int,
	mysqlTable,
	primaryKey,
	tinyint,
	unique,
	varchar,
} from "drizzle-orm/mysql-core"

export const authUser = mysqlTable(
	"auth_user",
	{
		id: int().autoincrement().notNull(),
		password: varchar({ length: 128 }).notNull(),
		lastLogin: datetime("last_login", { mode: "string", fsp: 6 }),
		isSuperuser: tinyint("is_superuser").notNull(),
		username: varchar({ length: 150 }).notNull(),
		firstName: varchar("first_name", { length: 150 }).notNull(),
		lastName: varchar("last_name", { length: 150 }).notNull(),
		email: varchar({ length: 254 }).notNull(),
		isStaff: tinyint("is_staff").notNull(),
		isActive: tinyint("is_active").notNull(),
		dateJoined: datetime("date_joined", { mode: "string", fsp: 6 }).notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "auth_user_id" }),
		unique("username").on(table.username),
	],
)

export const authGroup = mysqlTable(
	"auth_group",
	{
		id: int().autoincrement().notNull(),
		name: varchar({ length: 150 }).notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "auth_group_id" }),
		unique("name").on(table.name),
	],
)

export const authUserGroups = mysqlTable(
	"auth_user_groups",
	{
		id: int().autoincrement().notNull(),
		userId: int("user_id")
			.notNull()
			.references(() => authUser.id),
		groupId: int("group_id")
			.notNull()
			.references(() => authGroup.id),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "auth_user_groups_id" }),
		unique("auth_user_groups_user_id_group_id_94350c0c_uniq").on(table.userId, table.groupId),
	],
)

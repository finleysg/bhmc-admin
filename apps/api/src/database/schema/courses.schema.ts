import { int, mysqlTable, primaryKey, unique, varchar } from "drizzle-orm/mysql-core"

export const course = mysqlTable(
	"courses_course",
	{
		id: int().autoincrement().notNull(),
		name: varchar({ length: 100 }).notNull(),
		numberOfHoles: int("number_of_holes").notNull(),
		ggId: varchar("gg_id", { length: 22 }),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "courses_course_id" }),
		unique("name").on(table.name),
	],
)

export const hole = mysqlTable(
	"courses_hole",
	{
		id: int().autoincrement().notNull(),
		holeNumber: int("hole_number").notNull(),
		par: int().notNull(),
		courseId: int("course_id")
			.notNull()
			.references(() => course.id),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "courses_hole_id" }),
		unique("unique_course_holenumber").on(table.courseId, table.holeNumber),
	],
)

export const tee = mysqlTable(
	"courses_tee",
	{
		id: int().autoincrement().notNull(),
		name: varchar({ length: 20 }).notNull(),
		ggId: varchar("gg_id", { length: 22 }),
		courseId: int("course_id")
			.notNull()
			.references(() => course.id),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: "courses_tee_id" }),
		unique("unique_course_tee").on(table.courseId, table.name),
	],
)

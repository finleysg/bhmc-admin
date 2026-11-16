import { int, mysqlTable, primaryKey, varchar } from "drizzle-orm/mysql-core"

/** Photo and document tags (Django content.Tag). */
export const contentTag = mysqlTable(
	"content_tag",
	{
		id: int().autoincrement().notNull(),
		name: varchar({ length: 40 }).notNull(),
	},
	(table) => [primaryKey({ columns: [table.id], name: "content_tag_id" })],
)

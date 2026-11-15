import { drizzle, MySql2Database } from "drizzle-orm/mysql2"
import * as mysql from "mysql2/promise"

let pool: mysql.Pool | undefined
let db: MySql2Database | undefined

/** Direct connection to the test database, for seeding and assertions. */
export function testDb(): MySql2Database {
	if (!db) {
		pool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 2 })
		db = drizzle(pool)
	}
	return db
}

/**
 * A separate connection, for tests that play a second admin: open a
 * transaction, lock rows, change them, and commit while the app waits.
 * The caller must `end()` it.
 */
export function openConnection(): Promise<mysql.Connection> {
	return mysql.createConnection({ uri: process.env.DATABASE_URL })
}

export async function closeTestDb(): Promise<void> {
	await pool?.end()
	pool = undefined
	db = undefined
}

/**
 * Tables the tests write to, children first. Add a table here when a test
 * (or the code it exercises) starts writing to it.
 */
const RESET_TABLES = [
	"register_registrationchangelog",
	"register_registrationfee",
	"payments_payment",
	"register_registrationslot",
	"register_registration",
	"register_player",
	"events_eventsessionfee",
	"events_eventsession",
	"events_eventfee",
	"events_feetype",
	"events_event_courses",
	"events_event",
	"courses_tee",
	"courses_hole",
	"courses_course",
	"core_adminauditentry",
	"core_adminsetting",
	"auth_user_groups",
	"auth_user",
]

/** Empties every table the tests write to. Call in beforeEach. */
export async function resetDb(): Promise<void> {
	testDb()
	// FOREIGN_KEY_CHECKS is per connection, so hold one for the whole reset.
	const conn = await pool!.getConnection()
	try {
		await conn.query("SET FOREIGN_KEY_CHECKS = 0")
		for (const table of RESET_TABLES) {
			await conn.query(`TRUNCATE TABLE \`${table}\``)
		}
	} finally {
		await conn.query("SET FOREIGN_KEY_CHECKS = 1")
		conn.release()
	}
}

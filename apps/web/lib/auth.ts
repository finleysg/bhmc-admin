/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

/**
 * Lightweight Better Auth initialization following official docs.
 *
 * This file exports a `auth` instance created with `betterAuth()` and
 * uses a direct better-sqlite3 database instance. It's intentionally
 * minimal and follows the examples in the Better Auth docs so route
 * handlers can use `toNextJsHandler(auth.handler)` directly.
 *
 * Environment variables:
 * - BETTER_AUTH_DATABASE: path to sqlite file (default: ./docker/sqlite/auth.db)
 * - BETTER_AUTH_SECRET: secret string (required)
 * - BETTER_AUTH_JWT_SECRET: optional shared JWT secret (if you enable jwt plugin)
 */

import { betterAuth } from "better-auth"
import { admin, jwt } from "better-auth/plugins"
import Database from "better-sqlite3"

const dbPath = process.env.BETTER_AUTH_DATABASE || "./docker/sqlite/auth.db"
const secret = process.env.BETTER_AUTH_SECRET

if (!secret) {
	// Defer throwing so imports don't crash during dev scaffolding; handlers should check.
	// But log a warning to surface the misconfiguration.
	console.warn("BETTER_AUTH_SECRET is not set; authentication will not function properly.")
}

const sqlite = new Database(dbPath)

const plugins = [admin(), jwt()]

export const auth = betterAuth({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	database: sqlite as any, // better-sqlite3 Database type compatibility
	emailAndPassword: {
		enabled: true,
	},
	secret: secret,
	plugins,
})

export default auth

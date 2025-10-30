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

/* eslint-disable @typescript-eslint/no-var-requires */
// @ts-ignore: missing types for better-sqlite3 in this workspace
import Database from "better-sqlite3"
import { betterAuth } from "better-auth"

const dbPath = process.env.BETTER_AUTH_DATABASE || "./docker/sqlite/auth.db"
const secret = process.env.BETTER_AUTH_SECRET

if (!secret) {
	// Defer throwing so imports don't crash during dev scaffolding; handlers should check.
	// But log a warning to surface the misconfiguration.
	// eslint-disable-next-line no-console
	console.warn("BETTER_AUTH_SECRET is not set; authentication will not function properly.")
}

const sqlite = new Database(dbPath)

let plugins: any[] | undefined = undefined
try {
	// jwt plugin is optional — include if available and env var set
	// Use dynamic require to avoid build-time type resolution issues.
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const jwtPlugin = require("better-auth/plugins").jwt
	if (process.env.BETTER_AUTH_JWT_SECRET && typeof jwtPlugin === "function") {
		plugins = [jwtPlugin({ secret: process.env.BETTER_AUTH_JWT_SECRET })]
	}
} catch {
	// plugin not installed — continue without it
}

export const auth = betterAuth({
	database: sqlite as any,
	emailAndPassword: {
		enabled: true,
	},
	secret: secret as string | undefined,
	plugins,
})

export default auth

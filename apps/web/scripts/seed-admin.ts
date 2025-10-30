/**
 * apps/web/scripts/seed-admin.ts
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=ChangeMe pnpm exec tsx scripts/seed-admin.ts
 *
 * This script imports the app's `lib/auth` instance and attempts to create an admin user.
 * It tries a few common Better Auth APIs and exits with code 0 if the user already exists.
 */

import auth from "../lib/auth"

async function main() {
	const email = process.env.SEED_ADMIN_EMAIL || process.argv[2]
	const password = process.env.SEED_ADMIN_PASSWORD || process.argv[3]

	if (!email || !password) {
		// eslint-disable-next-line no-console
		console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be provided (env or args).")
		// eslint-disable-next-line no-console
		console.error(
			"Example: SEED_ADMIN_EMAIL=admin@x.com SEED_ADMIN_PASSWORD=secret pnpm exec tsx scripts/seed-admin.ts"
		)
		process.exit(1)
	}

	try {
		// Try common Better Auth APIs. Some installs expose `auth.createUser`, `auth.admin.createUser`,
		// or `auth.emailAndPassword.createUser`. Attempt a few fallbacks.
		if (typeof (auth as any).createUser === "function") {
			await (auth as any).createUser({ email, password, role: "admin" })
			// eslint-disable-next-line no-console
			console.log("Admin user created (auth.createUser).")
			return process.exit(0)
		}

		if ((auth as any).admin && typeof (auth as any).admin.createUser === "function") {
			await (auth as any).admin.createUser({ email, password, role: "admin" })
			// eslint-disable-next-line no-console
			console.log("Admin user created (auth.admin.createUser).")
			return process.exit(0)
		}

		if (
			(auth as any).emailAndPassword &&
			typeof (auth as any).emailAndPassword.createUser === "function"
		) {
			await (auth as any).emailAndPassword.createUser({ email, password })
			// eslint-disable-next-line no-console
			console.log("Admin user created (auth.emailAndPassword.createUser).")
			return process.exit(0)
		}

		// If we reach here, the auth API shape wasn't detected.
		// eslint-disable-next-line no-console
		console.error("Unable to find a supported createUser API on the imported auth instance.")
		// eslint-disable-next-line no-console
		console.error(
			"Check `apps/web/lib/auth.ts` for the exported API and adjust this script accordingly."
		)
		process.exit(1)
	} catch (err: any) {
		if (err && err.message && /already exists/i.test(err.message)) {
			// eslint-disable-next-line no-console
			console.log("User already exists - no action taken.")
			return process.exit(0)
		}
		// eslint-disable-next-line no-console
		console.error("Failed to create admin user:", err)
		process.exit(1)
	}
}

main()

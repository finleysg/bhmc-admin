import type { AdminRole } from "@repo/domain/types"

import type { ApiClient } from "./api-client"
import type { CliConfig } from "./config"
import type { CredentialStore } from "./credentials"
import { djangoLogin, djangoLogout } from "./django-auth"
import { CliError } from "./errors"

/** What each command needs; passed in so commands are testable without a terminal. */
export interface CommandContext {
	config: CliConfig
	credentials: CredentialStore
	api: ApiClient
	ask: (question: string, options?: { hidden?: boolean }) => Promise<string>
}

/** The signed-in user, as returned by GET /me. */
export interface WhoAmI {
	id: number
	email: string
	name: string
	isSuperuser: boolean
	roles: AdminRole[]
}

export async function login(ctx: CommandContext, options: { email?: string }) {
	const email = options.email ?? (await ctx.ask("Email: "))
	const password = await ctx.ask("Password: ", { hidden: true })
	if (!email || !password) throw new CliError("Email and password are required")

	const token = await djangoLogin(ctx.config.djangoUrl, email, password)
	await ctx.credentials.set(ctx.config.apiUrl, { token, email })
	const me = await ctx.api.get<WhoAmI>("/me")
	return { loggedIn: true, apiUrl: ctx.config.apiUrl, user: me }
}

export async function logout(ctx: CommandContext) {
	const credential = await ctx.credentials.get(ctx.config.apiUrl)
	if (credential) {
		await djangoLogout(ctx.config.djangoUrl, credential.token)
		await ctx.credentials.delete(ctx.config.apiUrl)
	}
	return { loggedOut: true, apiUrl: ctx.config.apiUrl }
}

export async function whoami(ctx: CommandContext) {
	return { apiUrl: ctx.config.apiUrl, user: await ctx.api.get<WhoAmI>("/me") }
}

import type { AdminRole, EventReadiness, ReadinessSummary } from "@repo/domain/types"

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

/** Ready to Open Registration for one event (with findings) or a season (summaries). */
export async function readiness(ctx: CommandContext, options: { event?: string; season?: string }) {
	if (options.event)
		return ctx.api.get<EventReadiness>(`/events/${eventId(options.event)}/readiness`)
	if (options.season) {
		return ctx.api.get<ReadinessSummary[]>(
			`/readiness?season=${encodeURIComponent(options.season)}`,
		)
	}
	throw new CliError("Give --event <id> or --season <year>")
}

function eventId(value: string): number {
	const id = Number(value)
	if (!Number.isInteger(id) || id <= 0) throw new CliError(`Not an event id: ${value}`)
	return id
}

interface WarningArgs {
	eventId: string
	code: string
	subject?: string
	apply?: boolean
}

/** Finds the warning on the event, or fails with what the event does have. */
async function findWarning(ctx: CommandContext, args: WarningArgs) {
	const id = eventId(args.eventId)
	const subject = args.subject ?? ""
	const current = await ctx.api.get<EventReadiness>(`/events/${id}/readiness`)
	const finding = current.findings.find(
		(f) => f.severity === "warning" && f.code === args.code && f.subject === subject,
	)
	if (!finding) {
		const warnings = current.findings
			.filter((f) => f.severity === "warning")
			.map((f) => `${f.code} ${f.subject}`.trim())
		throw new CliError(
			`Event ${id} has no warning ${args.code} ${subject}`.trim() +
				(warnings.length ? `. Its warnings: ${warnings.join("; ")}` : ""),
		)
	}
	return { id, subject, finding }
}

/** Dismisses a readiness warning for an event. A dry run unless `apply`. */
export async function dismissWarning(ctx: CommandContext, args: WarningArgs) {
	const { id, subject, finding } = await findWarning(ctx, args)
	if (finding.dismissed) return { dryRun: !args.apply, alreadyDismissed: true, finding }
	if (!args.apply) return { dryRun: true, wouldDismiss: finding }
	return ctx.api.request<EventReadiness>("POST", `/events/${id}/readiness/dismissals`, {
		code: args.code,
		subject,
	})
}

/** Brings back a dismissed readiness warning. A dry run unless `apply`. */
export async function restoreWarning(ctx: CommandContext, args: WarningArgs) {
	const { id, subject, finding } = await findWarning(ctx, args)
	if (!finding.dismissed) return { dryRun: !args.apply, notDismissed: true, finding }
	if (!args.apply) return { dryRun: true, wouldRestore: finding }
	const query = new URLSearchParams({ code: args.code, subject })
	return ctx.api.request<EventReadiness>("DELETE", `/events/${id}/readiness/dismissals?${query}`)
}

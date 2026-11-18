import type {
	AdminRole,
	EventReadiness,
	EventTypeValue,
	FeeType,
	InspectorSearchResult,
	ReadinessSummary,
	RegistrationInspection,
	RollForwardEventInput,
	RollForwardInput,
	RollForwardPreview,
	RollForwardResult,
	SeasonFeeChange,
	SeasonFeeChangeInput,
} from "@repo/domain/types"

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

/**
 * Registration Inspector, always for one event: one registration with its slots, fees,
 * payments, refunds, live Stripe check, and change log; or, without an id, the event's
 * registrations, narrowed by --player (name, GHIN, or email).
 */
export async function inspectRegistration(
	ctx: CommandContext,
	args: { event: string; id?: string; player?: string },
) {
	const base = `/registration-inspector/events/${eventId(args.event)}`
	if (args.id) {
		const id = Number(args.id)
		if (!Number.isInteger(id) || id <= 0) throw new CliError(`Not a registration id: ${args.id}`)
		return ctx.api.get<RegistrationInspection>(`${base}/registrations/${id}`)
	}
	const query = args.player ? `?${new URLSearchParams({ q: args.player })}` : ""
	return ctx.api.get<InspectorSearchResult[]>(`${base}/search${query}`)
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

interface RollForwardArgs {
	from: string
	to?: string
	/** Source event ids to leave out, each value comma-separated. */
	drop?: string[]
	/** "<sourceEventId>=<YYYY-MM-DD>": a different date than proposed. */
	date?: string[]
	/** "<sourceEventId>=<name>": a different name than proposed. */
	name?: string[]
	apply?: boolean
}

/**
 * Season roll-forward: proposes every event of the source season in the target season
 * (default: the next), adjusted by --drop, --date, and --name. A dry run shows each
 * event's issues; --apply creates them all, or none if any has an issue.
 */
export async function seasonRollForward(ctx: CommandContext, args: RollForwardArgs) {
	const fromSeason = season(args.from)
	const toSeason = args.to ? season(args.to) : fromSeason + 1
	const path = "/seasons/roll-forward"
	const proposed = await ctx.api.request<RollForwardPreview>("POST", `${path}/preview`, {
		fromSeason,
		toSeason,
	})

	const known = new Set(proposed.events.map((e) => e.sourceEventId))
	const check = (id: number) => {
		if (!known.has(id))
			throw new CliError(`Event ${id} is not an event of the ${fromSeason} season`)
		return id
	}
	const dropped = new Set(
		(args.drop ?? []).flatMap((v) => v.split(",")).map((v) => check(eventId(v.trim()))),
	)
	const dates = assignments(args.date, check)
	const names = assignments(args.name, check)
	const events: RollForwardEventInput[] = proposed.events
		.filter((e) => !dropped.has(e.sourceEventId))
		.map((e) => ({
			sourceEventId: e.sourceEventId,
			name: names.get(e.sourceEventId) ?? e.name,
			startDate: dates.get(e.sourceEventId) ?? e.startDate,
		}))
	if (events.length === 0) throw new CliError("No events left to roll forward")

	const body: RollForwardInput = { fromSeason, toSeason, events }
	if (!args.apply) {
		const preview = await ctx.api.request<RollForwardPreview>("POST", `${path}/preview`, body)
		const refused = preview.events.filter((e) => e.issues.length > 0).length
		return { dryRun: true, ...preview, dropped: [...dropped], refused }
	}
	return ctx.api.request<RollForwardResult>("POST", path, body)
}

interface FeeChangeArgs {
	season: string
	/** A fee type id, or its name (any case). */
	feeType: string
	from: string
	to: string
	/** An event type code (N, W, ...); every event type when omitted. */
	eventType?: string
	apply?: boolean
}

/**
 * Season Fee Change: every amount of one fee type equal to --from becomes --to, across a
 * season. A dry run shows the events it covers; --apply changes all but the refused ones
 * (events with registrations, or whose registration has opened).
 */
export async function feesChange(ctx: CommandContext, args: FeeChangeArgs) {
	const body: SeasonFeeChangeInput = {
		season: season(args.season),
		feeTypeId: await feeTypeId(ctx, args.feeType),
		fromAmount: amount(args.from),
		toAmount: amount(args.to),
		eventType: (args.eventType?.toUpperCase() as EventTypeValue | undefined) ?? null,
	}
	const path = "/seasons/fee-change"
	if (!args.apply) {
		return {
			dryRun: true,
			...(await ctx.api.request<SeasonFeeChange>("POST", `${path}/preview`, body)),
		}
	}
	return ctx.api.request<SeasonFeeChange>("POST", path, body)
}

async function feeTypeId(ctx: CommandContext, value: string): Promise<number> {
	if (/^\d+$/.test(value)) return Number(value)
	const types = await ctx.api.get<FeeType[]>("/fee-types")
	const match = types.find((t) => t.name.toLowerCase() === value.trim().toLowerCase())
	if (!match) {
		throw new CliError(
			`No fee type named "${value}". Fee types: ${types.map((t) => t.name).join(", ")}`,
		)
	}
	return match.id
}

function amount(value: string): number {
	const n = Number(value.replace(/^\$/, ""))
	if (value.trim() === "" || !Number.isFinite(n) || n < 0)
		throw new CliError(`Not an amount: ${value}`)
	return n
}

function season(value: string): number {
	const year = Number(value)
	if (!Number.isInteger(year) || year < 2000 || year > 2100) {
		throw new CliError(`Not a season: ${value}`)
	}
	return year
}

/** Parses "<eventId>=<value>" options into a map. */
function assignments(values: string[] | undefined, check: (id: number) => number) {
	const map = new Map<number, string>()
	for (const v of values ?? []) {
		const at = v.indexOf("=")
		if (at < 1 || at === v.length - 1) throw new CliError(`Expected <eventId>=<value>: ${v}`)
		map.set(check(eventId(v.slice(0, at))), v.slice(at + 1))
	}
	return map
}

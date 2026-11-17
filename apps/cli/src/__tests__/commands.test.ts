import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { ApiClient } from "../api-client"
import {
	type CommandContext,
	dismissWarning,
	login,
	logout,
	readiness,
	restoreWarning,
	seasonRollForward,
	whoami,
} from "../commands"
import type { CliConfig } from "../config"
import { CredentialStore } from "../credentials"

const respond = (status: number, body: unknown) =>
	Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response)

/** Django's login response: the token arrives only as the httponly access_token cookie. */
const loggedIn = (token: string | null) =>
	Promise.resolve(
		new Response(JSON.stringify({}), {
			status: 200,
			headers: token
				? { "Set-Cookie": `access_token=${token}; HttpOnly; Path=/; SameSite=Lax` }
				: {},
		}),
	)

const me = {
	id: 1,
	email: "ops@example.com",
	name: "Ops Person",
	isSuperuser: false,
	roles: ["event-admin"],
}

describe("CLI commands", () => {
	let dir: string
	let ctx: CommandContext
	let fetchMock: jest.Mock

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "bhmc-cli-"))
		const config: CliConfig = {
			apiUrl: "http://api.test",
			djangoUrl: "http://django.test",
			credentialsPath: join(dir, "credentials.json"),
		}
		const credentials = new CredentialStore(config.credentialsPath)
		ctx = {
			config,
			credentials,
			api: new ApiClient(config, credentials),
			ask: jest.fn((question: string) =>
				Promise.resolve(question.startsWith("Email") ? "ops@example.com" : "s3cret"),
			),
		}
		fetchMock = jest.fn()
		global.fetch = fetchMock
	})

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true })
	})

	describe("login", () => {
		it("logs in with Django, stores the token, and confirms it against the API", async () => {
			fetchMock.mockReturnValueOnce(loggedIn("tok-1")).mockReturnValueOnce(respond(200, me))

			const result = await login(ctx, {})

			expect(fetchMock).toHaveBeenNthCalledWith(
				1,
				"http://django.test/auth/token/login/",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ email: "ops@example.com", password: "s3cret" }),
				}),
			)
			expect(ctx.ask).toHaveBeenCalledWith("Password: ", { hidden: true })
			expect(await ctx.credentials.get("http://api.test")).toEqual({
				token: "tok-1",
				email: "ops@example.com",
			})
			expect(result).toEqual({ loggedIn: true, apiUrl: "http://api.test", user: me })
		})

		it("uses --email instead of asking for it", async () => {
			fetchMock.mockReturnValueOnce(loggedIn("tok-1")).mockReturnValueOnce(respond(200, me))

			await login(ctx, { email: "given@example.com" })

			expect(ctx.ask).toHaveBeenCalledTimes(1)
			expect(fetchMock.mock.calls[0]![1].body).toContain("given@example.com")
		})

		it("stores nothing when Django sends no token", async () => {
			fetchMock.mockReturnValueOnce(loggedIn(null))

			await expect(login(ctx, {})).rejects.toThrow("no access_token cookie")
			expect(await ctx.credentials.get("http://api.test")).toBeUndefined()
		})

		it("reports Django's message for bad credentials and stores nothing", async () => {
			fetchMock.mockReturnValueOnce(
				respond(400, { non_field_errors: ["Unable to log in with provided credentials."] }),
			)

			await expect(login(ctx, {})).rejects.toThrow("Unable to log in with provided credentials.")
			expect(await ctx.credentials.get("http://api.test")).toBeUndefined()
		})
	})

	describe("whoami", () => {
		it("calls the API as the operator, marked as the CLI", async () => {
			await ctx.credentials.set("http://api.test", { token: "tok-1", email: "ops@example.com" })
			fetchMock.mockReturnValueOnce(respond(200, me))

			expect(await whoami(ctx)).toEqual({ apiUrl: "http://api.test", user: me })
			expect(fetchMock).toHaveBeenCalledWith(
				"http://api.test/me",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Token tok-1",
						"X-Admin-Client": "cli",
					}),
				}),
			)
		})

		it("says to log in when there is no stored token", async () => {
			await expect(whoami(ctx)).rejects.toThrow("Not logged in to http://api.test. Run: bhmc login")
			expect(fetchMock).not.toHaveBeenCalled()
		})

		it("says to log in again when the token is rejected", async () => {
			await ctx.credentials.set("http://api.test", { token: "old", email: "ops@example.com" })
			fetchMock.mockReturnValueOnce(respond(401, { message: "Invalid or expired token" }))

			await expect(whoami(ctx)).rejects.toMatchObject({
				message: "Your login has expired or was revoked. Run: bhmc login",
				status: 401,
			})
		})
	})

	describe("logout", () => {
		it("revokes the token with Django and forgets it", async () => {
			await ctx.credentials.set("http://api.test", { token: "tok-1", email: "ops@example.com" })
			fetchMock.mockReturnValueOnce(respond(204, null))

			expect(await logout(ctx)).toEqual({ loggedOut: true, apiUrl: "http://api.test" })
			expect(fetchMock).toHaveBeenCalledWith(
				"http://django.test/auth/token/logout/",
				expect.objectContaining({ headers: { Authorization: "Token tok-1" } }),
			)
			expect(await ctx.credentials.get("http://api.test")).toBeUndefined()
		})

		it("succeeds when already logged out", async () => {
			expect(await logout(ctx)).toEqual({ loggedOut: true, apiUrl: "http://api.test" })
			expect(fetchMock).not.toHaveBeenCalled()
		})
	})

	describe("readiness", () => {
		const warning = {
			code: "fee-differs",
			subject: "3",
			severity: "warning",
			what: "Cart Fee is $14.00",
			dismissed: false,
		}
		const eventReadiness = (dismissed = false) => ({
			eventId: 7,
			applies: true,
			level: dismissed ? "green" : "yellow",
			findings: [{ ...warning, dismissed }],
		})

		beforeEach(async () => {
			await ctx.credentials.set("http://api.test", { token: "tok-1", email: "ops@example.com" })
		})

		const call = (n: number) => fetchMock.mock.calls[n] as [string, RequestInit]

		it("shows one event's findings", async () => {
			fetchMock.mockReturnValueOnce(respond(200, eventReadiness()))
			expect(await readiness(ctx, { event: "7" })).toEqual(eventReadiness())
			expect(call(0)[0]).toBe("http://api.test/events/7/readiness")
		})

		it("summarizes a season", async () => {
			fetchMock.mockReturnValueOnce(respond(200, []))
			await readiness(ctx, { season: "2027" })
			expect(call(0)[0]).toBe("http://api.test/readiness?season=2027")
		})

		it("needs an event or a season", async () => {
			await expect(readiness(ctx, {})).rejects.toThrow("Give --event <id> or --season <year>")
		})

		it("previews a dismissal without changing anything", async () => {
			fetchMock.mockReturnValueOnce(respond(200, eventReadiness()))

			const result = await dismissWarning(ctx, { eventId: "7", code: "fee-differs", subject: "3" })

			expect(result).toEqual({ dryRun: true, wouldDismiss: warning })
			expect(fetchMock).toHaveBeenCalledTimes(1)
		})

		it("dismisses with --apply", async () => {
			fetchMock
				.mockReturnValueOnce(respond(200, eventReadiness()))
				.mockReturnValueOnce(respond(201, eventReadiness(true)))

			const result = await dismissWarning(ctx, {
				eventId: "7",
				code: "fee-differs",
				subject: "3",
				apply: true,
			})

			expect(result).toEqual(eventReadiness(true))
			expect(call(1)[0]).toBe("http://api.test/events/7/readiness/dismissals")
			expect(call(1)[1]).toMatchObject({
				method: "POST",
				body: JSON.stringify({ code: "fee-differs", subject: "3" }),
			})
			expect((call(1)[1].headers as Record<string, string>)["X-Admin-Client"]).toBe("cli")
		})

		it("restores with --apply", async () => {
			fetchMock
				.mockReturnValueOnce(respond(200, eventReadiness(true)))
				.mockReturnValueOnce(respond(200, eventReadiness()))

			await restoreWarning(ctx, { eventId: "7", code: "fee-differs", subject: "3", apply: true })

			expect(call(1)[0]).toBe(
				"http://api.test/events/7/readiness/dismissals?code=fee-differs&subject=3",
			)
			expect(call(1)[1].method).toBe("DELETE")
		})

		it("names the event's warnings when the one asked for is not there", async () => {
			fetchMock.mockReturnValueOnce(respond(200, eventReadiness()))

			await expect(
				dismissWarning(ctx, { eventId: "7", code: "schedule-differs", subject: "startTime" }),
			).rejects.toThrow(
				"Event 7 has no warning schedule-differs startTime. Its warnings: fee-differs 3",
			)
		})
	})

	describe("season roll-forward", () => {
		const proposal = (sourceEventId: number, name: string, startDate: string) => ({
			sourceEventId,
			name,
			startDate,
			issues: [],
		})
		const proposed = {
			fromSeason: 2026,
			toSeason: 2027,
			events: [
				proposal(667, "2027 Season Registration", "2027-01-17"),
				proposal(670, "Individual LG/LN", "2027-03-31"),
				proposal(720, "Payment Testing", "2027-01-16"),
			],
		}
		const call = (n: number) => fetchMock.mock.calls[n] as [string, RequestInit]
		const sent = (n: number) => JSON.parse(call(n)[1].body as string) as unknown

		beforeEach(async () => {
			await ctx.credentials.set("http://api.test", { token: "tok-1", email: "ops@example.com" })
		})

		it("previews the adjusted events into the next season without creating them", async () => {
			fetchMock
				.mockReturnValueOnce(respond(200, proposed))
				.mockReturnValueOnce(respond(200, { ...proposed, events: [] }))

			const result = await seasonRollForward(ctx, {
				from: "2026",
				drop: ["720"],
				date: ["670=2027-04-07"],
				name: ["670=Opener"],
			})

			expect(call(0)[0]).toBe("http://api.test/seasons/roll-forward/preview")
			expect(sent(0)).toEqual({ fromSeason: 2026, toSeason: 2027 })
			expect(call(1)[0]).toBe("http://api.test/seasons/roll-forward/preview")
			expect(sent(1)).toEqual({
				fromSeason: 2026,
				toSeason: 2027,
				events: [
					{ sourceEventId: 667, name: "2027 Season Registration", startDate: "2027-01-17" },
					{ sourceEventId: 670, name: "Opener", startDate: "2027-04-07" },
				],
			})
			expect(result).toMatchObject({ dryRun: true, dropped: [720], refused: 0 })
		})

		it("creates the events with --apply", async () => {
			fetchMock
				.mockReturnValueOnce(respond(200, proposed))
				.mockReturnValueOnce(respond(201, { created: [] }))

			await seasonRollForward(ctx, { from: "2026", to: "2027", drop: ["720,667"], apply: true })

			expect(call(1)[0]).toBe("http://api.test/seasons/roll-forward")
			expect(sent(1)).toEqual({
				fromSeason: 2026,
				toSeason: 2027,
				events: [{ sourceEventId: 670, name: "Individual LG/LN", startDate: "2027-03-31" }],
			})
		})

		it("refuses an event that is not in the source season", async () => {
			fetchMock.mockReturnValueOnce(respond(200, proposed))

			await expect(seasonRollForward(ctx, { from: "2026", drop: ["999"] })).rejects.toThrow(
				"Event 999 is not an event of the 2026 season",
			)
		})
	})
})

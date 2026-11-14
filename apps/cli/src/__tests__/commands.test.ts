import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { ApiClient } from "../api-client"
import { type CommandContext, login, logout, whoami } from "../commands"
import type { CliConfig } from "../config"
import { CredentialStore } from "../credentials"

const respond = (status: number, body: unknown) =>
	Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response)

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
			fetchMock
				.mockReturnValueOnce(respond(200, { auth_token: "tok-1" }))
				.mockReturnValueOnce(respond(200, me))

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
			fetchMock
				.mockReturnValueOnce(respond(200, { auth_token: "tok-1" }))
				.mockReturnValueOnce(respond(200, me))

			await login(ctx, { email: "given@example.com" })

			expect(ctx.ask).toHaveBeenCalledTimes(1)
			expect(fetchMock.mock.calls[0]![1].body).toContain("given@example.com")
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
})

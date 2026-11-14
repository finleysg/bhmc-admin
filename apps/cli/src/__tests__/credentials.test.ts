import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { CredentialStore } from "../credentials"

describe("CredentialStore", () => {
	let dir: string
	let path: string

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "bhmc-cli-"))
		path = join(dir, "nested", "credentials.json")
	})

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true })
	})

	it("returns nothing before any login", async () => {
		expect(await new CredentialStore(path).get("http://localhost:3333")).toBeUndefined()
	})

	it("keeps one token per API URL", async () => {
		const store = new CredentialStore(path)
		await store.set("http://localhost:3333", { token: "local", email: "a@example.com" })
		await store.set("https://api.bhmc.org", { token: "prod", email: "a@example.com" })

		expect(await store.get("http://localhost:3333")).toEqual({
			token: "local",
			email: "a@example.com",
		})
		expect(await store.get("https://api.bhmc.org")).toEqual({
			token: "prod",
			email: "a@example.com",
		})
	})

	it("writes a file only its owner can read", async () => {
		await new CredentialStore(path).set("http://localhost:3333", { token: "t", email: "e" })

		expect((await stat(path)).mode & 0o777).toBe(0o600)
		expect(JSON.parse(await readFile(path, "utf8"))).toEqual({
			"http://localhost:3333": { token: "t", email: "e" },
		})
	})

	it("forgets one API URL's token and keeps the others", async () => {
		const store = new CredentialStore(path)
		await store.set("http://localhost:3333", { token: "local", email: "e" })
		await store.set("https://api.bhmc.org", { token: "prod", email: "e" })

		await store.delete("http://localhost:3333")

		expect(await store.get("http://localhost:3333")).toBeUndefined()
		expect(await store.get("https://api.bhmc.org")).toBeDefined()
	})
})

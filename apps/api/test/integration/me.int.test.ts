import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb } from "./support/db"
import { createUser } from "./support/factories"

describe("GET /me", () => {
	let t: TestApp

	beforeAll(async () => {
		t = await createTestApp()
	})

	beforeEach(async () => {
		await resetDb()
	})

	afterAll(async () => {
		await t.close()
		await closeTestDb()
	})

	it("returns the signed-in user and the admin roles they hold", async () => {
		const user = await createUser({ roles: ["club-admin"] })

		const res = await t.http(user).get("/me")

		expect(res.status).toBe(200)
		expect(res.body).toEqual({
			id: user.id,
			email: user.email,
			name: `${user.firstName} ${user.lastName}`,
			isSuperuser: false,
			roles: ["club-admin"],
		})
	})

	it("lists every role for a superuser", async () => {
		const user = await createUser({ superuser: true })

		const res = await t.http(user).get("/me")

		expect(res.body).toMatchObject({ isSuperuser: true, roles: ["club-admin", "event-admin"] })
	})

	it("works for a member with no admin role", async () => {
		const user = await createUser()

		const res = await t.http(user).get("/me")

		expect(res.status).toBe(200)
		expect(res.body).toMatchObject({ roles: [] })
	})

	it("requires a token", async () => {
		expect((await t.http().get("/me")).status).toBe(401)
	})
})

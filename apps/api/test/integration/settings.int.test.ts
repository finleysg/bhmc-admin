import { adminAuditEntry, adminSetting } from "../../src/database"
import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb, testDb } from "./support/db"
import { createUser, TestUser } from "./support/factories"

const KEY = "readiness.alertLeadDays"

describe("/settings", () => {
	let t: TestApp
	let clubAdmin: TestUser

	beforeAll(async () => {
		t = await createTestApp()
	})

	beforeEach(async () => {
		await resetDb()
		clubAdmin = await createUser({ roles: ["club-admin"] })
	})

	afterAll(async () => {
		await t.close()
		await closeTestDb()
	})

	it("lists every setting with its default before anyone changes it", async () => {
		const res = await t.http(clubAdmin).get("/settings")

		expect(res.status).toBe(200)
		expect(res.body).toEqual([
			expect.objectContaining({
				key: KEY,
				type: "integer",
				value: 7,
				defaultValue: 7,
				updatedAt: null,
				updatedBy: null,
			}),
		])
	})

	it("saves a new value and reports who changed it", async () => {
		const put = await t.http(clubAdmin).put(`/settings/${KEY}`).send({ value: 10 })

		expect(put.status).toBe(200)
		expect(put.body).toMatchObject({
			key: KEY,
			value: 10,
			updatedBy: `${clubAdmin.firstName} ${clubAdmin.lastName}`,
		})
		expect((put.body as { updatedAt: string | null }).updatedAt).toBeTruthy()
		const [list] = (await t.http(clubAdmin).get("/settings")).body as { value: number }[]
		expect(list).toMatchObject({ value: 10 })
	})

	it("audits the change with the setting's key as the field", async () => {
		await t.http(clubAdmin).put(`/settings/${KEY}`).send({ value: 10 })
		await t.http(clubAdmin).put(`/settings/${KEY}`).send({ value: 14 })

		const [row] = await testDb().select().from(adminSetting)
		const entries = await testDb().select().from(adminAuditEntry)
		expect(entries.map((e) => [e.operation, e.entityType, e.entityId, e.changes])).toEqual([
			["setting.update", "setting", row.id, { [KEY]: { before: 7, after: 10 } }],
			["setting.update", "setting", row.id, { [KEY]: { before: 10, after: 14 } }],
		])
	})

	it("does not audit saving the value it already has", async () => {
		await t.http(clubAdmin).put(`/settings/${KEY}`).send({ value: 7 })

		expect(await testDb().select().from(adminAuditEntry)).toEqual([])
	})

	it.each([
		["below the minimum", 0],
		["above the maximum", 61],
		["not a whole number", 7.5],
		["not a number", "7"],
	])("rejects a value %s", async (_, value) => {
		const res = await t.http(clubAdmin).put(`/settings/${KEY}`).send({ value })

		expect(res.status).toBe(400)
		expect(await testDb().select().from(adminSetting)).toEqual([])
	})

	it("returns 404 for an unknown setting", async () => {
		const res = await t.http(clubAdmin).put("/settings/no.such.key").send({ value: 1 })
		expect(res.status).toBe(404)
	})

	it("is for Club Admins only", async () => {
		const eventAdmin = await createUser({ roles: ["event-admin"] })

		expect((await t.http(eventAdmin).get("/settings")).status).toBe(403)
		expect((await t.http(eventAdmin).put(`/settings/${KEY}`).send({ value: 10 })).status).toBe(403)
	})
})

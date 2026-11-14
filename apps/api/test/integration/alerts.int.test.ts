import { eq } from "drizzle-orm"

import { ALERT_SOURCES, AlertsService, type AlertFinding } from "../../src/alerts"
import { authGroup, authUser, authUserGroups } from "../../src/database"
import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb, testDb } from "./support/db"
import { createUser, TestUser } from "./support/factories"

async function joinGroup(userId: number, name: string) {
	const [group] = await testDb().select().from(authGroup).where(eq(authGroup.name, name))
	await testDb().insert(authUserGroups).values({ userId, groupId: group.id })
}

describe("admin alerts", () => {
	let t: TestApp
	let findings: AlertFinding[]

	beforeAll(async () => {
		t = await createTestApp({
			overrides: [[ALERT_SOURCES, [{ name: "Test", findings: () => Promise.resolve(findings) }]]],
		})
	})

	beforeEach(async () => {
		await resetDb()
		findings = []
	})

	afterAll(async () => {
		await t.close()
		await closeTestDb()
	})

	const eventAdminFinding = (): AlertFinding => ({
		source: "Readiness",
		title: "Fees missing",
		detail: "Configure the event's fees before signup opens.",
		recipients: [{ role: "event-admin" }],
	})

	it("addresses role findings to active group members only", async () => {
		const member = await createUser()
		await joinGroup(member.id, "Event Admin")
		const inactive = await createUser()
		await joinGroup(inactive.id, "Event Admin")
		await testDb().update(authUser).set({ isActive: 0 }).where(eq(authUser.id, inactive.id))
		const otherRole = await createUser()
		await joinGroup(otherRole.id, "Club Admin")
		await createUser({ superuser: true }) // holds every permission, but isn't a member
		findings = [eventAdminFinding()]

		const viewer = await createUser({ roles: ["club-admin"] })
		const res = await t.http(viewer).get("/alerts/preview")

		expect(res.status).toBe(200)
		expect((res.body as { email: string }[]).map((d) => d.email)).toEqual([member.email])
	})

	it("previews nothing when there are no findings", async () => {
		const admin = await createUser({ roles: ["club-admin"] })

		const res = await t.http(admin).get("/alerts/preview")

		expect(res.body).toEqual([])
	})

	it("forbids the preview to members without an admin role", async () => {
		const member: TestUser = await createUser()

		expect((await t.http(member).get("/alerts/preview")).status).toBe(403)
	})

	it("emails each recipient their digest when the daily run fires", async () => {
		const member = await createUser()
		await joinGroup(member.id, "Event Admin")
		findings = [eventAdminFinding()]

		const result = await t.app.get(AlertsService).run(new Date())

		expect(result).toEqual({ sent: 1, failed: 0 })
		expect(t.mail.sendEmail).toHaveBeenCalledWith(
			expect.objectContaining({ to: member.email, subject: "BHMC admin alerts: 1 item" }),
		)
	})
})

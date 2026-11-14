import { AlertsService } from "../alerts.service"
import type { AlertFinding, AlertSource } from "../alerts.types"

const today = new Date("2027-01-12T13:00:00Z")

function source(name: string, findings: AlertFinding[]): AlertSource {
	return { name, findings: jest.fn().mockResolvedValue(findings) }
}

const finding = (title: string, recipients: AlertFinding["recipients"]): AlertFinding => ({
	source: "Readiness",
	title,
	detail: `${title} detail`,
	recipients,
})

function setup(sources: AlertSource[], groups: Record<string, string[]> = {}) {
	const recipients = {
		emailsInGroup: jest.fn((group: string) => Promise.resolve(groups[group] ?? [])),
	}
	const mail = { sendEmail: jest.fn().mockResolvedValue(undefined) }
	const service = new AlertsService(sources, recipients as never, mail as never)
	return { service, recipients, mail }
}

describe("AlertsService", () => {
	it("sends nothing when there are no findings", async () => {
		const { service, mail } = setup([source("Readiness", [])])

		expect(await service.run(today)).toEqual({ sent: 0, failed: 0 })
		expect(mail.sendEmail).not.toHaveBeenCalled()
	})

	it("sends one digest per recipient with all of their findings", async () => {
		const { service, mail } = setup(
			[
				source("Readiness", [
					finding("Fees missing", [{ role: "event-admin" }]),
					finding("Dates out of order", [{ role: "event-admin" }]),
				]),
			],
			{ "Event Admin": ["ann@example.com", "bob@example.com"] },
		)

		expect(await service.run(today)).toEqual({ sent: 2, failed: 0 })
		expect(mail.sendEmail).toHaveBeenCalledTimes(2)
		expect(mail.sendEmail).toHaveBeenCalledWith(
			expect.objectContaining({ to: "ann@example.com", subject: "BHMC admin alerts: 2 items" }),
		)
	})

	it("sends a person one copy of a finding however they are addressed", async () => {
		const { service } = setup(
			[
				source("Readiness", [
					finding("Fees missing", [{ role: "event-admin" }, { email: "Ann@Example.com " }]),
				]),
			],
			{ "Event Admin": ["ann@example.com"] },
		)

		expect(await service.plan(today)).toEqual([
			{
				email: "ann@example.com",
				findings: [{ source: "Readiness", title: "Fees missing", detail: "Fees missing detail" }],
			},
		])
	})

	it("routes findings to the right people", async () => {
		const { service } = setup(
			[
				source("Readiness", [finding("Fees missing", [{ role: "event-admin" }])]),
				source("Payouts", [finding("Credit not posted", [{ email: "treasurer@example.com" }])]),
			],
			{ "Event Admin": ["ann@example.com"], "Club Admin": ["cat@example.com"] },
		)

		const plan = await service.plan(today)

		expect(plan.map((d) => [d.email, d.findings.map((f) => f.title)])).toEqual([
			["ann@example.com", ["Fees missing"]],
			["treasurer@example.com", ["Credit not posted"]],
		])
	})

	it("looks up each role's members once per run", async () => {
		const { service, recipients } = setup(
			[
				source("Readiness", [
					finding("A", [{ role: "event-admin" }]),
					finding("B", [{ role: "event-admin" }]),
				]),
			],
			{ "Event Admin": ["ann@example.com"] },
		)

		await service.plan(today)

		expect(recipients.emailsInGroup).toHaveBeenCalledTimes(1)
	})

	it("keeps sending after one recipient fails", async () => {
		const { service, mail } = setup(
			[source("Readiness", [finding("Fees missing", [{ role: "event-admin" }])])],
			{ "Event Admin": ["ann@example.com", "bob@example.com"] },
		)
		mail.sendEmail.mockRejectedValueOnce(new Error("smtp down"))

		expect(await service.run(today)).toEqual({ sent: 1, failed: 1 })
		expect(mail.sendEmail).toHaveBeenCalledTimes(2)
	})
})

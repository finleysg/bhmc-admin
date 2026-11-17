import { render, screen } from "@testing-library/react"

import type { EventReadiness, ReadinessFinding } from "@repo/domain/types"

import { apiGet } from "../../../../../lib/server-api"

import ReadinessPage from "../page"

jest.mock("../../../../../lib/server-api", () => ({ apiGet: jest.fn() }))
jest.mock("../components/warning-button", () => ({
	WarningButton: ({ dismissed }: { dismissed: boolean }) => (
		<button>{dismissed ? "Restore" : "Dismiss"}</button>
	),
}))

const finding = (overrides: Partial<ReadinessFinding>): ReadinessFinding => ({
	code: "no-slots",
	subject: "",
	severity: "blocking",
	what: "Players choose their slots, but the event has none",
	why: "Players will have nothing to choose.",
	fix: "Create the slots.",
	tab: "slots",
	dismissed: false,
	...overrides,
})

async function renderPage(readiness: Partial<EventReadiness>) {
	jest.mocked(apiGet).mockResolvedValue({
		eventId: 7,
		milestone: "open-registration",
		applies: true,
		level: "green",
		findings: [],
		...readiness,
	})
	render(await ReadinessPage({ params: Promise.resolve({ eventId: "7" }) }))
}

describe("ReadinessPage", () => {
	it("lists findings by severity, linking each to the tab where it is fixed", async () => {
		await renderPage({
			level: "red",
			findings: [
				finding({}),
				finding({
					code: "fee-differs",
					subject: "3",
					severity: "warning",
					what: "Cart Fee is $14.00",
					tab: "fees",
				}),
				finding({
					code: "schedule-differs",
					subject: "startTime",
					severity: "warning",
					what: "Start time is 4:00 PM",
					tab: "event",
					dismissed: true,
				}),
			],
		})

		expect(apiGet).toHaveBeenCalledWith("/events/7/readiness")
		expect(
			screen.getByText("Not ready to open registration: 1 blocking, 1 warning."),
		).toBeInTheDocument()
		for (const heading of ["Blocking", "Warnings", "Dismissed"]) {
			expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument()
		}
		expect(screen.getByRole("link", { name: "Go to Slots" })).toHaveAttribute(
			"href",
			"/events/7/setup?tab=slots",
		)
		expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument()
	})

	it("says when there is nothing to fix", async () => {
		await renderPage({})
		expect(
			screen.getByText("Nothing to fix. The event is ready to open registration."),
		).toBeInTheDocument()
	})

	it("says when the checks no longer apply", async () => {
		await renderPage({ applies: false })
		expect(screen.getByText(/these checks no longer apply/)).toBeInTheDocument()
	})
})

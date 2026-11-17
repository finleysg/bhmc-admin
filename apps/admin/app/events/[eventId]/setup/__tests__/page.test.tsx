import { render, screen } from "@testing-library/react"

import type { ClubEvent } from "@repo/domain/types"

import { apiGet } from "../../../../../lib/server-api"

import EventSetupPage from "../page"

jest.mock("../../../../../lib/server-api", () => ({ apiGet: jest.fn() }))
jest.mock("../actions", () => ({ updateEventSettings: jest.fn() }))
jest.mock("../../../../components/content-editor", () => ({ ContentEditor: () => null }))
jest.mock("../components/courses-panel", () => ({ CoursesPanel: () => null }))
jest.mock("../components/fees-panel", () => ({ FeesPanel: () => null }))
jest.mock("../components/slots-panel", () => ({ SlotsPanel: () => null }))
jest.mock("../components/sessions-panel", () => ({ SessionsPanel: () => null }))

function serve(event: Partial<ClubEvent>) {
	jest
		.mocked(apiGet)
		.mockImplementation((path: string) =>
			Promise.resolve(
				path.endsWith("/setup")
					? { id: 7, name: "Test", startDate: "2027-05-05", courses: [], eventFees: [], ...event }
					: [],
			),
		)
}

async function renderPage(tab?: string) {
	render(
		await EventSetupPage({
			params: Promise.resolve({ eventId: "7" }),
			searchParams: Promise.resolve({ tab }),
		}),
	)
}

describe("EventSetupPage", () => {
	beforeEach(() => jest.mocked(apiGet).mockReset())

	it("shows Courses and Slots, not Sessions, when players choose a slot", async () => {
		serve({ canChoose: true, registrationType: "M" })
		await renderPage()

		expect(screen.getByRole("tab", { name: "Courses" })).toBeInTheDocument()
		expect(screen.getByRole("tab", { name: "Slots" })).toBeInTheDocument()
		expect(screen.getByRole("tab", { name: "Fees" })).toBeInTheDocument()
		expect(screen.queryByRole("tab", { name: "Sessions" })).not.toBeInTheDocument()
		expect(apiGet).toHaveBeenCalledWith("/events/7/slots")
	})

	it("opens the tab named in the URL", async () => {
		serve({ canChoose: true, registrationType: "M" })
		await renderPage("fees")

		expect(screen.getByRole("tab", { name: "Fees" })).toHaveAttribute("aria-selected", "true")
	})

	it("shows Sessions, not Slots, when players register for a session", async () => {
		serve({ canChoose: false, registrationType: "M" })
		await renderPage()

		expect(screen.getByRole("tab", { name: "Sessions" })).toBeInTheDocument()
		expect(screen.queryByRole("tab", { name: "Slots" })).not.toBeInTheDocument()
		expect(apiGet).not.toHaveBeenCalledWith("/events/7/slots")
	})

	it("hides Courses when players do not choose a slot", async () => {
		serve({ canChoose: false, registrationType: "M" })
		await renderPage()

		expect(screen.queryByRole("tab", { name: "Courses" })).not.toBeInTheDocument()
		expect(screen.getByRole("tab", { name: "Fees" })).toBeInTheDocument()
	})

	it("hides Fees when the event has no registration", async () => {
		serve({ canChoose: false, registrationType: "N" })
		await renderPage()

		expect(screen.queryByRole("tab", { name: "Fees" })).not.toBeInTheDocument()
		expect(screen.queryByRole("tab", { name: "Sessions" })).not.toBeInTheDocument()
	})
})

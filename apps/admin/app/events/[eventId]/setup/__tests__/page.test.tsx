import { render, screen } from "@testing-library/react"

import type { ClubEvent } from "@repo/domain/types"

import { apiGet } from "../../../../../lib/server-api"

import EventSetupPage from "../page"

jest.mock("../../../../../lib/server-api", () => ({ apiGet: jest.fn() }))
jest.mock("../actions", () => ({ updateEventSettings: jest.fn() }))
jest.mock("../../../../components/content-editor", () => ({ ContentEditor: () => null }))
jest.mock("../components/courses-panel", () => ({ CoursesPanel: () => null }))
jest.mock("../components/fees-panel", () => ({ FeesPanel: () => null }))

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

async function renderPage() {
	render(await EventSetupPage({ params: Promise.resolve({ eventId: "7" }) }))
}

describe("EventSetupPage", () => {
	it("shows Courses when players choose a slot and Fees when the event has registration", async () => {
		serve({ canChoose: true, registrationType: "M" })
		await renderPage()

		expect(screen.getByRole("tab", { name: "Courses" })).toBeInTheDocument()
		expect(screen.getByRole("tab", { name: "Fees" })).toBeInTheDocument()
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
	})
})

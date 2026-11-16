import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { ClubEvent } from "@repo/domain/types"

import { copiedSettings, NewEventForm } from "../new-event-form"

jest.mock("../../actions", () => ({ createEvent: jest.fn() }))
jest.mock("../../../../components/content-editor", () => ({ ContentEditor: () => null }))
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }))

const source = {
	id: 670,
	name: "Individual LG/LN",
	eventType: "N",
	registrationType: "M",
	status: "C",
	startDate: "2026-04-01",
	season: 2026,
	canChoose: true,
	ghinRequired: true,
	starterTimeInterval: 0,
	teamSize: 1,
	ageRestrictionType: "N",
	groupSize: 5,
	ggId: "gg-1",
	portalUrl: "https://portal",
	// 5:00 PM and 6:00 PM CDT Sunday Mar 29; payments end noon Apr 1
	prioritySignupStart: "2026-03-29T22:00:00.000Z",
	signupStart: "2026-03-29T23:00:00.000Z",
	signupEnd: "2026-03-31T01:00:00.000Z",
	paymentsEnd: "2026-04-01T17:00:00.000Z",
	courses: [{ id: 1 }, { id: 2 }],
	eventFees: [{ id: 3 }],
	sessions: [],
} as unknown as ClubEvent

// The dialog's own behaviour is its concern; here it just hands back the chosen event.
jest.mock("../copy-from-event-dialog", () => ({
	CopyFromEventDialog: ({ onCopy }: { onCopy: (e: ClubEvent) => void }) => (
		<button type="button" onClick={() => onCopy(source)}>
			Copy from event
		</button>
	),
}))

const value = (name: string) => document.querySelector<HTMLInputElement>(`[name=${name}]`)?.value

describe("copiedSettings", () => {
	it("moves the signup dates with an entered event date, at the same club time", () => {
		const copied = copiedSettings(source, 2027, "2027-03-31")

		expect(copied).toMatchObject({
			startDate: "2027-03-31",
			season: 2027,
			status: "S",
			ggId: null,
			portalUrl: null,
			prioritySignupStart: "2027-03-28T22:00:00.000Z",
			signupStart: "2027-03-28T23:00:00.000Z",
			signupEnd: "2027-03-30T01:00:00.000Z",
			paymentsEnd: "2027-03-31T17:00:00.000Z",
		})
	})

	it("leaves the event and signup dates blank without an event date", () => {
		expect(copiedSettings(source, 2027, "")).toMatchObject({
			startDate: "",
			prioritySignupStart: null,
			signupStart: null,
			signupEnd: null,
			paymentsEnd: null,
		})
	})
})

describe("NewEventForm", () => {
	it("fills the form from the chosen event, except what belongs only to it", async () => {
		render(<NewEventForm season={2027} tags={[]} />)

		await userEvent.click(screen.getByRole("button", { name: "Copy from event" }))

		expect(value("name")).toBe("Individual LG/LN")
		// The source is a 2026 event; the new event stays in the season chosen on the list.
		expect(value("season")).toBe("2027")
		expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Scheduled")
		expect(value("portalUrl")).toBe("")
		expect(screen.getByText(/also copies its 2 courses, 1 fee, and 0 sessions/)).toBeInTheDocument()
		expect(value("copyFromEventId")).toBe("670")
	})

	it("leaves the dates blank when no event date was entered first", async () => {
		render(<NewEventForm season={2027} tags={[]} />)

		await userEvent.click(screen.getByRole("button", { name: "Copy from event" }))

		expect(value("startDate")).toBe("")
		expect(value("signupStart")).toBe("")
		expect(value("paymentsEnd")).toBe("")
		expect(screen.getByText(/Enter the event date and signup dates/)).toBeInTheDocument()
	})

	it("fills the signup dates to match an event date entered first", async () => {
		render(<NewEventForm season={2027} tags={[]} />)
		fireEvent.change(document.querySelector("[name=startDate]")!, {
			target: { value: "2027-03-31" },
		})

		await userEvent.click(screen.getByRole("button", { name: "Copy from event" }))

		expect(value("startDate")).toBe("2027-03-31")
		expect(value("prioritySignupStart")).toBe("2027-03-28T17:00")
		expect(value("signupStart")).toBe("2027-03-28T18:00")
		expect(value("signupEnd")).toBe("2027-03-29T20:00")
		expect(value("paymentsEnd")).toBe("2027-03-31T12:00")
		expect(screen.getByText(/Signup dates were moved to match Mar 31, 2027/)).toBeInTheDocument()
	})

	it("starts blank again", async () => {
		render(<NewEventForm season={2027} tags={[]} />)
		await userEvent.click(screen.getByRole("button", { name: "Copy from event" }))

		await userEvent.click(screen.getByRole("button", { name: "Start blank" }))

		expect(value("name")).toBe("")
		expect(value("season")).toBe("2027")
		expect(value("copyFromEventId")).toBeUndefined()
	})

	it("starts blank in the season chosen on the list, and cancels back to that season", () => {
		render(<NewEventForm season={2027} tags={[]} />)

		expect(value("season")).toBe("2027")
		expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
			"href",
			"/events?season=2027",
		)
	})
})

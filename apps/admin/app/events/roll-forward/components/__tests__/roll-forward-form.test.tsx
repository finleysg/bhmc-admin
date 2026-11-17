import { render, screen } from "@testing-library/react"

import type { RollForwardPreview } from "@repo/domain/types"

import { RollForwardForm } from "../roll-forward-form"

jest.mock("../../actions", () => ({ rollForward: jest.fn() }))

const preview: RollForwardPreview = {
	fromSeason: 2026,
	toSeason: 2027,
	events: [
		{
			sourceEventId: 667,
			sourceName: "2026 Season Registration",
			sourceStartDate: "2026-01-18",
			sourceStatus: "S",
			eventType: "R",
			name: "2027 Season Registration",
			startDate: "2027-01-17",
			createsSlots: false,
			issues: [],
		},
		{
			sourceEventId: 686,
			sourceName: "4 Man Scramble",
			sourceStartDate: "2026-06-10",
			sourceStatus: "C",
			eventType: "N",
			name: "4 Man Scramble",
			startDate: "2027-06-09",
			createsSlots: true,
			issues: ['An event named "4 Man Scramble" already exists on 2027-06-09'],
		},
	],
}

describe("RollForwardForm", () => {
	it("proposes every event, checked, with its new name and date", () => {
		render(<RollForwardForm preview={preview} />)

		expect(
			screen.getAllByRole("checkbox").every((c) => c.getAttribute("data-state") === "checked"),
		).toBe(true)
		expect(screen.getByDisplayValue("2027 Season Registration")).toBeInTheDocument()
		expect(screen.getByDisplayValue("2027-06-09")).toBeInTheDocument()
	})

	it("marks canceled events and events that get slots", () => {
		render(<RollForwardForm preview={preview} />)

		expect(screen.getByText("Canceled")).toBeInTheDocument()
		expect(screen.getByText("Slots")).toBeInTheDocument()
	})

	it("shows an event's issues on its row", () => {
		render(<RollForwardForm preview={preview} />)

		expect(
			screen.getByText('An event named "4 Man Scramble" already exists on 2027-06-09'),
		).toBeInTheDocument()
		expect(screen.getByDisplayValue("4 Man Scramble")).toHaveAttribute("aria-invalid", "true")
	})
})

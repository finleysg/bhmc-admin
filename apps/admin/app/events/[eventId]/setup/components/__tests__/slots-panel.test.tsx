import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { ClubEvent, SlotGroup } from "@repo/domain/types"

import { groupLabel, SlotsPanel } from "../slots-panel"

jest.mock("../../actions", () => ({
	appendTeeTime: jest.fn(),
	createSlots: jest.fn(),
	deleteSlotGroup: jest.fn(),
	setSlotGroupStatus: jest.fn(),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const teeTimes = {
	id: 7,
	startType: "TT",
	startTime: "3:00 PM",
	teeTimeSplits: "9",
	starterTimeInterval: 0,
	signupStart: "2099-04-28T14:00:00.000Z",
} as ClubEvent

type Cell = [status: string, playerName?: string]

/** A group whose slots are the given cells; counts are derived from them, as the API does. */
const group = (
	startingOrder: number,
	cells: Cell[] = [["A"], ["A"], ["A"], ["A"], ["A"]],
	overrides: Partial<SlotGroup> = {},
): SlotGroup => {
	const statusCounts: Record<string, number> = {}
	for (const [status] of cells) statusCounts[status] = (statusCounts[status] ?? 0) + 1
	return {
		courseId: 1,
		courseName: "East",
		holeId: 10 + startingOrder,
		holeNumber: 1,
		startingOrder,
		statusCounts,
		filled: cells.filter(([, name]) => name).length,
		total: cells.length,
		slots: cells.map(([status, playerName], slot) => ({
			id: startingOrder * 10 + slot,
			slot,
			status,
			playerName: playerName ?? null,
		})),
		...overrides,
	}
}

describe("groupLabel", () => {
	it("shows the tee time from the event's start time and splits", () => {
		expect(groupLabel(teeTimes, group(2))).toBe("3:18 PM")
	})

	it("shows the hole and wave for a shotgun", () => {
		const shotgun = { ...teeTimes, startType: "SG" } as ClubEvent
		expect(groupLabel(shotgun, group(1, undefined, { holeNumber: 3 }))).toBe("Hole 3B")
	})
})

describe("SlotsPanel", () => {
	it("offers Create slots when the event has none", () => {
		render(<SlotsPanel event={teeTimes} groups={[]} />)
		expect(screen.getByRole("button", { name: "Create slots" })).toBeEnabled()
	})

	it("offers adding a tee time, disabling, and deleting an empty group", () => {
		render(<SlotsPanel event={teeTimes} groups={[group(0)]} />)

		expect(screen.getByRole("button", { name: "Add tee time" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Enable" })).not.toBeInTheDocument()
	})

	it("shows each slot as a tee sheet cell: the player's name, or the slot's status", () => {
		render(
			<SlotsPanel
				event={teeTimes}
				groups={[group(0, [["R", "Pat Smith"], ["P"], ["A"], ["U"], ["X", "Lee Jones"]])]}
			/>,
		)

		const row = screen.getByTestId("tee-sheet-row")
		expect(row).toHaveTextContent("3:00 PM")
		expect(row).toHaveTextContent("Pat Smith")
		expect(row).toHaveTextContent("Lee Jones")
		expect(row).toHaveTextContent("In Progress")
		expect(row).toHaveTextContent("Available")
		expect(row).toHaveTextContent("Unavailable")
	})

	it("offers enabling a disabled group and does not offer deleting one with a player", () => {
		render(
			<SlotsPanel
				event={teeTimes}
				groups={[group(0, [["R", "Pat Smith"], ["U"], ["U"], ["U"], ["U"]])]}
			/>,
		)

		expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument()
	})

	it("puts each course on its own tab", async () => {
		const west = group(0, undefined, { courseId: 2, courseName: "West", holeId: 99 })
		render(<SlotsPanel event={teeTimes} groups={[group(0), group(1), west]} />)

		expect(screen.getAllByTestId("tee-sheet-row")).toHaveLength(2)
		await userEvent.click(screen.getByRole("tab", { name: "West" }))
		expect(screen.getAllByTestId("tee-sheet-row")).toHaveLength(1)
	})

	it("stops creating and deleting once registration has opened", () => {
		const opened = { ...teeTimes, signupStart: "2020-01-01T14:00:00.000Z" } as ClubEvent

		const { rerender } = render(<SlotsPanel event={opened} groups={[]} />)
		expect(screen.getByRole("button", { name: "Create slots" })).toBeDisabled()

		rerender(<SlotsPanel event={opened} groups={[group(0)]} />)
		expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Add tee time" })).toBeInTheDocument()
	})
})

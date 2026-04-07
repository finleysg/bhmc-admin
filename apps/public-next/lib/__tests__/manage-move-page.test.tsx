/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"

import type { ClubEventDetail, Course } from "../types"
import type { ServerRegistration } from "../registration/types"
import type { AvailableSlotGroup } from "../hooks/use-available-slot-groups"

// Mock Radix Select to avoid scrollIntoView issues in jsdom
jest.mock("../../components/ui/select", () => {
	const SelectRoot = ({
		value,
		onValueChange,
		children,
	}: {
		value?: string
		onValueChange?: (v: string) => void
		children: React.ReactNode
	}) => (
		<div data-testid="select-root" data-value={value} data-onchange={onValueChange?.toString()}>
			{React.Children.map(children, (child) =>
				React.isValidElement(child)
					? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
							onValueChange,
						})
					: child,
			)}
		</div>
	)
	const SelectTrigger = ({ children }: { children: React.ReactNode }) => (
		<button role="combobox">{children}</button>
	)
	const SelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>
	const SelectContent = ({
		children,
		onValueChange,
	}: {
		children: React.ReactNode
		onValueChange?: (v: string) => void
	}) => (
		<div>
			{React.Children.map(children, (child) =>
				React.isValidElement(child)
					? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
							onValueChange,
						})
					: child,
			)}
		</div>
	)
	const SelectItem = ({
		value,
		children,
		onValueChange,
	}: {
		value: string
		children: React.ReactNode
		onValueChange?: (v: string) => void
	}) => (
		<button role="option" onClick={() => onValueChange?.(value)}>
			{children}
		</button>
	)
	return { Select: SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem }
})

// --- Factories ---

const eastCourse: Course = {
	id: 10,
	name: "East",
	number_of_holes: 9,
	gg_id: null,
	color: null,
	holes: [
		{ id: 100, course_id: 10, hole_number: 1, par: 4 },
		{ id: 101, course_id: 10, hole_number: 2, par: 4 },
	],
	tees: [],
}

const westCourse: Course = {
	id: 20,
	name: "West",
	number_of_holes: 9,
	gg_id: null,
	color: null,
	holes: [
		{ id: 200, course_id: 20, hole_number: 1, par: 4 },
		{ id: 201, course_id: 20, hole_number: 2, par: 4 },
	],
	tees: [],
}

function makeClubEvent(overrides: Partial<ClubEventDetail> = {}): ClubEventDetail {
	return {
		id: 1,
		name: "Weeknight",
		rounds: 1,
		ghin_required: false,
		total_groups: 10,
		status: "S",
		minimum_signup_group_size: 1,
		maximum_signup_group_size: 5,
		group_size: 5,
		start_type: "SG",
		can_choose: true,
		registration_window: "registration",
		external_url: null,
		season: 2026,
		tee_time_splits: null,
		notes: null,
		event_type: "N",
		skins_type: null,
		season_points: null,
		portal_url: null,
		priority_signup_start: null,
		start_date: "2026-03-01",
		start_time: "11:00 AM",
		registration_type: "M",
		signup_start: null,
		signup_end: null,
		signup_waves: null,
		payments_end: null,
		registration_maximum: null,
		courses: [eastCourse],
		fees: [],
		sessions: [],
		default_tag: null,
		starter_time_interval: 8,
		team_size: null,
		age_restriction: null,
		age_restriction_type: "",
		...overrides,
	}
}

function makeRegistration(overrides: Partial<ServerRegistration> = {}): ServerRegistration {
	return {
		id: 42,
		eventId: 1,
		courseId: 10,
		signedUpBy: "test@example.com",
		expires: "",
		notes: null,
		createdDate: "2026-03-01T00:00:00",
		slots: [
			{
				id: 101,
				eventId: 1,
				registrationId: 42,
				holeId: 100,
				player: {
					id: 1,
					firstName: "Alice",
					lastName: "Smith",
					email: "alice@example.com",
					ghin: null,
					birthDate: null,
					phoneNumber: null,
					tee: null,
					isMember: true,
					lastSeason: null,
				},
				startingOrder: 0,
				slot: 0,
				status: "R",
				fees: [],
			},
			{
				id: 102,
				eventId: 1,
				registrationId: 42,
				holeId: 100,
				player: {
					id: 2,
					firstName: "Bob",
					lastName: "Jones",
					email: "bob@example.com",
					ghin: null,
					birthDate: null,
					phoneNumber: null,
					tee: null,
					isMember: true,
					lastSeason: null,
				},
				startingOrder: 0,
				slot: 1,
				status: "R",
				fees: [],
			},
		],
		...overrides,
	}
}

// --- Mocks ---

const mockClubEvent = jest.fn<ClubEventDetail, []>(() => makeClubEvent())
const mockPlayer = jest.fn(() => ({ id: 1, email: "alice@example.com" }))
const mockRegistration = jest.fn<ServerRegistration, []>(() => makeRegistration())
const mockSlotGroups = jest.fn<AvailableSlotGroup[] | undefined, []>(() => [
	{ holeId: 101, holeNumber: 2, startingOrder: 0, slots: [{ id: 201 }, { id: 202 }] },
	{ holeId: 100, holeNumber: 1, startingOrder: 1, slots: [{ id: 203 }, { id: 204 }] },
])
const mockPush = jest.fn()

jest.mock("../registration/registration-context", () => ({
	useRegistration: () => ({ clubEvent: mockClubEvent() }),
}))

jest.mock("../hooks/use-my-player", () => ({
	useMyPlayer: () => ({ data: mockPlayer() }),
}))

jest.mock("../hooks/use-player-registration", () => ({
	usePlayerRegistration: () => ({ data: { registration: mockRegistration() } }),
}))

jest.mock("../hooks/use-available-slot-groups", () => ({
	useAvailableSlotGroups: () => ({ data: mockSlotGroups() }),
}))

jest.mock("../event-utils", () => ({
	getEventUrl: () => "/event/2026-03-01/weeknight",
}))

jest.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({
		invalidateQueries: jest.fn().mockResolvedValue(undefined),
	}),
}))

jest.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	usePathname: () => "/event/2026-03-01/weeknight/manage/move",
}))

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock("sonner", () => ({
	toast: {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		success: (...args: unknown[]) => mockToastSuccess(...args),
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		error: (...args: unknown[]) => mockToastError(...args),
	},
}))

beforeEach(() => {
	mockClubEvent.mockReset().mockImplementation(() => makeClubEvent())
	mockPlayer.mockReset().mockImplementation(() => ({ id: 1, email: "alice@example.com" }))
	mockRegistration.mockReset().mockImplementation(() => makeRegistration())
	mockSlotGroups.mockReset().mockImplementation(() => [
		{ holeId: 101, holeNumber: 2, startingOrder: 0, slots: [{ id: 201 }, { id: 202 }] },
		{ holeId: 100, holeNumber: 1, startingOrder: 1, slots: [{ id: 203 }, { id: 204 }] },
	])
	mockPush.mockReset()
	mockToastSuccess.mockReset()
	mockToastError.mockReset()
	global.fetch = jest.fn()
})

test("renders move page with spot selector and disabled Move button", async () => {
	const { default: MovePage } = await import("@/app/event/[eventDate]/[eventName]/manage/move/page")

	render(<MovePage />)

	expect(screen.getByText("Move Group")).toBeTruthy()
	expect(screen.getByText("Select starting spot")).toBeTruthy()

	const moveButton = screen.getByRole("button", { name: /^move$/i })
	expect((moveButton as HTMLButtonElement).disabled).toBe(true)
})

test("auto-selects course when only one course", async () => {
	const { default: MovePage } = await import("@/app/event/[eventDate]/[eventName]/manage/move/page")

	render(<MovePage />)

	// Should not show course selector for single course
	expect(screen.queryByText("Select course")).toBeNull()
	// Should show spot selector immediately
	expect(screen.getByText("Select starting spot")).toBeTruthy()
})

test("shows course selector with multiple courses", async () => {
	mockClubEvent.mockImplementation(() => makeClubEvent({ courses: [eastCourse, westCourse] }))

	const { default: MovePage } = await import("@/app/event/[eventDate]/[eventName]/manage/move/page")

	render(<MovePage />)

	expect(screen.getByText("Select course")).toBeTruthy()
	expect(screen.getByRole("button", { name: "East" })).toBeTruthy()
	expect(screen.getByRole("button", { name: "West" })).toBeTruthy()
})

test("successful move shows toast and navigates to manage", async () => {
	;(global.fetch as jest.Mock).mockResolvedValue({
		ok: true,
		json: () => Promise.resolve({ movedCount: 2 }),
	})

	const { default: MovePage } = await import("@/app/event/[eventDate]/[eventName]/manage/move/page")

	render(<MovePage />)

	// Select the "2A" spot via the mocked select
	fireEvent.click(screen.getByRole("option", { name: "2A" }))

	// Click Move
	fireEvent.click(screen.getByRole("button", { name: /^move$/i }))

	await waitFor(() => {
		expect(global.fetch).toHaveBeenCalledWith("/api/events/1/move-players", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				sourceSlotIds: [101, 102],
				destinationStartingHoleId: 101,
				destinationStartingOrder: 0,
			}),
		})
	})

	await waitFor(() => {
		expect(mockToastSuccess).toHaveBeenCalledWith("Group moved to 2A")
	})

	expect(mockPush).toHaveBeenCalledWith("/event/2026-03-01/weeknight/manage")
})

test("shows error toast on move failure", async () => {
	;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 })

	const { default: MovePage } = await import("@/app/event/[eventDate]/[eventName]/manage/move/page")

	render(<MovePage />)

	// Select a spot
	fireEvent.click(screen.getByRole("option", { name: "2A" }))

	fireEvent.click(screen.getByRole("button", { name: /^move$/i }))

	await waitFor(() => {
		expect(mockToastError).toHaveBeenCalledWith("Failed to move group")
	})
})

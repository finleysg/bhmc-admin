/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"

import type { ClubEventDetail } from "../types"
import type { ServerRegistration } from "../registration/types"

// --- Factories ---

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
		can_choose: false,
		registration_window: "current",
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
		courses: [],
		fees: [],
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
const mockPush = jest.fn()
const mockEditRegistration = jest.fn().mockResolvedValue(undefined)
const mockInitiateStripeSession = jest.fn()

jest.mock("../registration/registration-context", () => ({
	useRegistration: () => ({
		clubEvent: mockClubEvent(),
		editRegistration: mockEditRegistration,
		initiateStripeSession: mockInitiateStripeSession,
	}),
}))

jest.mock("../hooks/use-my-player", () => ({
	useMyPlayer: () => ({ data: mockPlayer() }),
}))

jest.mock("../hooks/use-player-registration", () => ({
	usePlayerRegistration: () => ({ data: { registration: mockRegistration() } }),
}))

const mockOpenSlots = jest.fn<unknown[], []>(() => [])
jest.mock("../hooks/use-open-slots", () => ({
	useOpenSlots: () => ({ data: mockOpenSlots() }),
}))

const mockAllSlots = jest.fn<unknown[], []>(() => [])
jest.mock("../hooks/use-registration-slots", () => ({
	useRegistrationSlots: () => ({ data: mockAllSlots() }),
}))

jest.mock("../event-utils", () => ({
	getEventUrl: () => "/event/2026-03-01/weeknight",
	RegistrationType: { MembersOnly: "M", ReturningMembersOnly: "R" },
}))

jest.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({
		invalidateQueries: jest.fn().mockResolvedValue(undefined),
	}),
}))

jest.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	usePathname: () => "/event/2026-03-01/weeknight/manage/add",
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

// Mock PlayerPicker — renders a button that triggers onSelect via user interaction,
// keeping state updates inside React's event system (no act warnings).
let lastExcludeIds: number[] = []
jest.mock("../../app/event/[eventDate]/[eventName]/components/player-picker", () => ({
	PlayerPicker: (props: {
		onSelect: (playerId: number, playerName: string) => void
		excludeIds?: number[]
	}) => {
		lastExcludeIds = props.excludeIds ?? []
		return (
			<button
				data-testid="player-picker"
				onClick={() => props.onSelect(3, "Charlie Brown")}
			>
				Select Charlie
			</button>
		)
	},
}))

beforeEach(() => {
	mockClubEvent.mockReset().mockImplementation(() => makeClubEvent())
	mockPlayer.mockReset().mockImplementation(() => ({ id: 1, email: "alice@example.com" }))
	mockRegistration.mockReset().mockImplementation(() => makeRegistration())
	mockPush.mockReset()
	mockEditRegistration.mockReset().mockResolvedValue(undefined)
	mockInitiateStripeSession.mockReset()
	mockToastSuccess.mockReset()
	mockToastError.mockReset()
	mockOpenSlots.mockReset().mockImplementation(() => [])
	mockAllSlots.mockReset().mockImplementation(() => [])
	lastExcludeIds = []
})

test("renders add players page with player picker and Continue button disabled", async () => {
	const { default: AddPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/add/page"
	)

	render(<AddPage />)

	expect(screen.getByText("Add Players")).toBeTruthy()
	expect(screen.getByTestId("player-picker")).toBeTruthy()

	const continueButton = screen.getByRole("button", { name: /continue/i })
	expect((continueButton as HTMLButtonElement).disabled).toBe(true)
})

test("shows no available slots message when group is full", async () => {
	// max group size = 2, and registration has 2 players → 0 available
	mockClubEvent.mockImplementation(() => makeClubEvent({ maximum_signup_group_size: 2 }))

	const { default: AddPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/add/page"
	)

	render(<AddPage />)

	expect(screen.getByText("Add Players")).toBeTruthy()
	expect(screen.getByText("No available slots to add players.")).toBeTruthy()
	expect(screen.queryByTestId("player-picker")).toBeNull()
	expect(screen.queryByRole("button", { name: /continue/i })).toBeNull()
})

test("Continue button enables after selecting a player", async () => {
	const { default: AddPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/add/page"
	)

	render(<AddPage />)

	// Click the mock picker button — triggers onSelect within React's event system
	fireEvent.click(screen.getByTestId("player-picker"))

	// Player appears in selected list
	expect(screen.getByText("Selected players")).toBeTruthy()
	expect(screen.getByText("Charlie Brown")).toBeTruthy()

	const continueButton = screen.getByRole("button", { name: /continue/i })
	expect((continueButton as HTMLButtonElement).disabled).toBe(false)
})

test("excludes registered and already-selected players from picker", async () => {
	mockAllSlots.mockImplementation(() => [
		{ id: 101, player: { id: 1 } },
		{ id: 102, player: { id: 2 } },
	])

	const { default: AddPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/add/page"
	)

	render(<AddPage />)

	// Initially excludes registered players (Alice=1, Bob=2)
	expect(lastExcludeIds).toEqual([1, 2])

	// After selecting Charlie, re-render passes Charlie's id too
	fireEvent.click(screen.getByTestId("player-picker"))

	expect(lastExcludeIds).toEqual([1, 2, 3])
})

test("clicking Continue calls editRegistration and navigates to edit flow", async () => {
	const { default: AddPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/add/page"
	)

	render(<AddPage />)

	fireEvent.click(screen.getByTestId("player-picker"))
	fireEvent.click(screen.getByRole("button", { name: /continue/i }))

	await waitFor(() => {
		expect(mockEditRegistration).toHaveBeenCalledWith(42, [3])
	})

	await waitFor(() => {
		expect(mockInitiateStripeSession).toHaveBeenCalled()
	})

	expect(mockPush).toHaveBeenCalledWith("/event/2026-03-01/weeknight/register")
})

test("shows error toast when editRegistration fails", async () => {
	mockEditRegistration.mockRejectedValue(new Error("Server error"))

	const { default: AddPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/add/page"
	)

	render(<AddPage />)

	fireEvent.click(screen.getByTestId("player-picker"))
	fireEvent.click(screen.getByRole("button", { name: /continue/i }))

	await waitFor(() => {
		expect(mockToastError).toHaveBeenCalledWith("Server error")
	})
})

test("can remove a selected player before submitting", async () => {
	const { default: AddPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/add/page"
	)

	render(<AddPage />)

	fireEvent.click(screen.getByTestId("player-picker"))

	// Player is selected, Continue enabled
	const continueBtn = screen.getByRole("button", { name: /continue/i })
	expect((continueBtn as HTMLButtonElement).disabled).toBe(false)

	// Remove the player
	fireEvent.click(screen.getByRole("button", { name: /remove/i }))

	// Continue should be disabled again
	const continueBtnAfter = screen.getByRole("button", { name: /continue/i })
	expect((continueBtnAfter as HTMLButtonElement).disabled).toBe(true)
	expect(screen.queryByText("Selected players")).toBeNull()
})

test("Back button navigates to manage page", async () => {
	const { default: AddPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/add/page"
	)

	render(<AddPage />)

	fireEvent.click(screen.getByRole("button", { name: /back/i }))

	expect(mockPush).toHaveBeenCalledWith("/event/2026-03-01/weeknight/manage")
})

test("canChoose event uses open slots count for available slots", async () => {
	mockClubEvent.mockImplementation(() =>
		makeClubEvent({ can_choose: true, maximum_signup_group_size: 5 }),
	)
	// 2 open slots on the same hole/starting_order
	mockOpenSlots.mockImplementation(() => [
		{ id: 201, status: "A" },
		{ id: 202, status: "A" },
	])

	const { default: AddPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/add/page"
	)

	render(<AddPage />)

	// Should show 2 slots available (from open slots), not 3 (from max - current)
	expect(screen.getByText(/2 slots available/)).toBeTruthy()
})

test("excludes players from other groups in the event", async () => {
	// All slots in the event: group players + a player in another group
	mockAllSlots.mockImplementation(() => [
		{ id: 101, player: { id: 1 } },
		{ id: 102, player: { id: 2 } },
		{ id: 201, player: { id: 99 } }, // player in another group
	])

	const { default: AddPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/add/page"
	)

	render(<AddPage />)

	// Player 99 from another group should be excluded
	expect(lastExcludeIds).toEqual([1, 2, 99])
})

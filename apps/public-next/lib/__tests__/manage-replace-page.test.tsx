/**
 * @jest-environment jsdom
 */

// cmdk uses ResizeObserver internally
global.ResizeObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
}

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
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

jest.mock("../registration/registration-context", () => ({
	useRegistration: () => ({ clubEvent: mockClubEvent() }),
}))

jest.mock("../hooks/use-my-player", () => ({
	useMyPlayer: () => ({ data: mockPlayer() }),
}))

jest.mock("../hooks/use-player-registration", () => ({
	usePlayerRegistration: () => ({ data: { registration: mockRegistration() } }),
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
	usePathname: () => "/event/2026-03-01/weeknight/manage/replace",
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
	mockPush.mockReset()
	mockToastSuccess.mockReset()
	mockToastError.mockReset()
	global.fetch = jest.fn()
})

test("renders replace page with source player selector and Replace button disabled", async () => {
	const { default: ReplacePage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/replace/page"
	)

	render(<ReplacePage />)

	expect(screen.getByText("Replace Player")).toBeTruthy()
	expect(screen.getByText("Player to replace")).toBeTruthy()
	expect(screen.getByText("Alice Smith")).toBeTruthy()
	expect(screen.getByText("Bob Jones")).toBeTruthy()
	expect(screen.getByText("Replacement player")).toBeTruthy()

	const replaceButton = screen.getByRole("button", { name: /^replace$/i })
	expect((replaceButton as HTMLButtonElement).disabled).toBe(true)
})

test("Replace button enabled after selecting source and searching for target", async () => {
	// Mock the search API for the player picker
	;(global.fetch as jest.Mock).mockResolvedValue({
		ok: true,
		json: () =>
			Promise.resolve([
				{
					id: 3,
					first_name: "Charlie",
					last_name: "Brown",
					email: "charlie@example.com",
					birth_date: null,
					is_member: true,
					last_season: 2025,
				},
			]),
	})

	const { default: ReplacePage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/replace/page"
	)

	jest.useFakeTimers()
	render(<ReplacePage />)

	// Step 1: Select source player (single-select)
	fireEvent.click(screen.getByLabelText("Bob Jones"))

	// Step 2: Search for replacement in player picker
	const searchInput = screen.getByPlaceholderText("Search for player...")
	fireEvent.change(searchInput, { target: { value: "Charlie" } })

	// Advance debounce timer
	await act(async () => {
		await jest.advanceTimersByTimeAsync(350)
	})

	await waitFor(() => {
		expect(screen.getByText("Charlie Brown")).toBeTruthy()
	})

	// Select Charlie
	fireEvent.click(screen.getByText("Charlie Brown"))

	const replaceButton = screen.getByRole("button", { name: /^replace$/i })
	expect((replaceButton as HTMLButtonElement).disabled).toBe(false)

	jest.useRealTimers()
})

test("confirming replace calls PATCH API and navigates to manage", async () => {
	// First call: search returns Charlie. Second call: PATCH succeeds.
	;(global.fetch as jest.Mock)
		.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve([
					{
						id: 3,
						first_name: "Charlie",
						last_name: "Brown",
						email: "charlie@example.com",
						birth_date: null,
						is_member: true,
						last_season: 2025,
					},
				]),
		})
		.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ slotId: 102, greenFeeDifference: undefined }),
		})

	const { default: ReplacePage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/replace/page"
	)

	jest.useFakeTimers()
	render(<ReplacePage />)

	// Select Bob as source
	fireEvent.click(screen.getByLabelText("Bob Jones"))

	// Search and select Charlie as target
	const searchInput = screen.getByPlaceholderText("Search for player...")
	fireEvent.change(searchInput, { target: { value: "Charlie" } })
	await act(async () => {
		await jest.advanceTimersByTimeAsync(350)
	})

	await waitFor(() => {
		expect(screen.getByText("Charlie Brown")).toBeTruthy()
	})

	fireEvent.click(screen.getByText("Charlie Brown"))
	jest.useRealTimers()

	// Click Replace
	fireEvent.click(screen.getByRole("button", { name: /^replace$/i }))

	await waitFor(() => {
		expect(global.fetch).toHaveBeenLastCalledWith("/api/events/1/replace-player", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				slotId: 102,
				originalPlayerId: 2,
				replacementPlayerId: 3,
			}),
		})
	})

	await waitFor(() => {
		expect(mockToastSuccess).toHaveBeenCalledWith("Bob Jones replaced by Charlie Brown")
	})

	expect(mockPush).toHaveBeenCalledWith("/event/2026-03-01/weeknight/manage")
})

test("shows error toast on replace failure", async () => {
	;(global.fetch as jest.Mock)
		.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve([
					{
						id: 3,
						first_name: "Charlie",
						last_name: "Brown",
						email: "charlie@example.com",
						birth_date: null,
						is_member: true,
						last_season: 2025,
					},
				]),
		})
		.mockResolvedValueOnce({ ok: false, status: 500 })

	const { default: ReplacePage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/replace/page"
	)

	jest.useFakeTimers()
	render(<ReplacePage />)

	fireEvent.click(screen.getByLabelText("Bob Jones"))

	const searchInput = screen.getByPlaceholderText("Search for player...")
	fireEvent.change(searchInput, { target: { value: "Charlie" } })
	await act(async () => {
		await jest.advanceTimersByTimeAsync(350)
	})

	await waitFor(() => {
		expect(screen.getByText("Charlie Brown")).toBeTruthy()
	})

	fireEvent.click(screen.getByText("Charlie Brown"))
	jest.useRealTimers()

	fireEvent.click(screen.getByRole("button", { name: /^replace$/i }))

	await waitFor(() => {
		expect(mockToastError).toHaveBeenCalledWith("Failed to replace player")
	})
})

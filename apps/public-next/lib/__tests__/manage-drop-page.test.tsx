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
}))

jest.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({
		invalidateQueries: jest.fn().mockResolvedValue(undefined),
	}),
}))

jest.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	usePathname: () => "/event/2026-03-01/weeknight/manage/drop",
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

test("renders drop players page with player list and disabled Drop button", async () => {
	const { default: DropPage } = await import("@/app/event/[eventDate]/[eventName]/manage/drop/page")

	render(<DropPage />)

	expect(screen.getByText("Drop Players")).toBeTruthy()
	expect(screen.getByText("Alice Smith")).toBeTruthy()
	expect(screen.getByText("Bob Jones")).toBeTruthy()

	const dropButton = screen.getByRole("button", { name: /^drop$/i })
	expect((dropButton as HTMLButtonElement).disabled).toBe(true)
})

test("Drop button enabled after selecting a player", async () => {
	const { default: DropPage } = await import("@/app/event/[eventDate]/[eventName]/manage/drop/page")

	render(<DropPage />)

	fireEvent.click(screen.getByLabelText("Bob Jones"))

	const dropButton = screen.getByRole("button", { name: /^drop$/i })
	expect((dropButton as HTMLButtonElement).disabled).toBe(false)
})

test("clicking Drop shows confirmation dialog with refund notice", async () => {
	const { default: DropPage } = await import("@/app/event/[eventDate]/[eventName]/manage/drop/page")

	render(<DropPage />)

	fireEvent.click(screen.getByLabelText("Alice Smith"))
	fireEvent.click(screen.getByRole("button", { name: /^drop$/i }))

	await waitFor(() => {
		const description = screen.getByText(/Are you sure you want to remove 1 player\(s\)/)
		expect(description).toBeTruthy()
		expect(description.textContent).toContain("Any paid fees will be automatically refunded")
	})
})

test("confirming drop calls POST API with slot IDs and navigates to manage", async () => {
	;(global.fetch as jest.Mock).mockResolvedValue({
		ok: true,
		json: () => Promise.resolve({ droppedCount: 1 }),
	})

	const { default: DropPage } = await import("@/app/event/[eventDate]/[eventName]/manage/drop/page")

	render(<DropPage />)

	// Select Bob (player id=2, slot id=102), not self (Alice is player id=1)
	fireEvent.click(screen.getByLabelText("Bob Jones"))
	fireEvent.click(screen.getByRole("button", { name: /^drop$/i }))

	await waitFor(() => {
		expect(screen.getByText(/Are you sure/)).toBeTruthy()
	})

	fireEvent.click(screen.getByRole("button", { name: /confirm/i }))

	await waitFor(() => {
		expect(global.fetch).toHaveBeenCalledWith("/api/events/1/drop-players", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ registrationId: 42, slotIds: [102], autoRefund: true }),
		})
	})

	await waitFor(() => {
		expect(mockToastSuccess).toHaveBeenCalledWith("1 player(s) dropped")
	})

	// Not dropping self and others remain → navigate to manage
	expect(mockPush).toHaveBeenCalledWith("/event/2026-03-01/weeknight/manage")
})

test("dropping self navigates to event detail page", async () => {
	;(global.fetch as jest.Mock).mockResolvedValue({
		ok: true,
		json: () => Promise.resolve({ droppedCount: 1 }),
	})

	const { default: DropPage } = await import("@/app/event/[eventDate]/[eventName]/manage/drop/page")

	render(<DropPage />)

	// Select Alice (self, player id=1)
	fireEvent.click(screen.getByLabelText("Alice Smith"))
	fireEvent.click(screen.getByRole("button", { name: /^drop$/i }))

	await waitFor(() => {
		expect(screen.getByText(/Are you sure/)).toBeTruthy()
	})

	fireEvent.click(screen.getByRole("button", { name: /confirm/i }))

	await waitFor(() => {
		expect(mockToastSuccess).toHaveBeenCalledWith("1 player(s) dropped")
	})

	// Dropping self → navigate to event detail
	expect(mockPush).toHaveBeenCalledWith("/event/2026-03-01/weeknight")
})

test("shows error toast on API failure", async () => {
	;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 })

	const { default: DropPage } = await import("@/app/event/[eventDate]/[eventName]/manage/drop/page")

	render(<DropPage />)

	fireEvent.click(screen.getByLabelText("Bob Jones"))
	fireEvent.click(screen.getByRole("button", { name: /^drop$/i }))

	await waitFor(() => {
		expect(screen.getByText(/Are you sure/)).toBeTruthy()
	})

	fireEvent.click(screen.getByRole("button", { name: /confirm/i }))

	await waitFor(() => {
		expect(mockToastError).toHaveBeenCalledWith("Failed to drop players")
	})
})

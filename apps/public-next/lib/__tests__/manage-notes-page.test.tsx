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
				id: 1,
				eventId: 1,
				registrationId: 42,
				holeId: 100,
				player: null,
				startingOrder: 0,
				slot: 0,
				status: "R",
				fees: [],
			},
		],
		...overrides,
	}
}

// --- Mocks ---

const mockClubEvent = jest.fn<ClubEventDetail, []>(() => makeClubEvent())
const mockPlayer = jest.fn(() => ({ id: 1, email: "test@example.com" }))
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
	usePathname: () => "/event/2026-03-01/weeknight/manage/notes",
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
	mockPlayer.mockReset().mockImplementation(() => ({ id: 1, email: "test@example.com" }))
	mockRegistration.mockReset().mockImplementation(() => makeRegistration())
	mockPush.mockReset()
	mockToastSuccess.mockReset()
	mockToastError.mockReset()
	global.fetch = jest.fn()
})

test("renders textarea with initial notes from registration", async () => {
	mockRegistration.mockImplementation(() => makeRegistration({ notes: "Please pair with Bob" }))

	const { default: ManageNotesPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/notes/page"
	)

	render(<ManageNotesPage />)

	const textarea = screen.getByRole("textbox")
	expect((textarea as HTMLTextAreaElement).value).toBe("Please pair with Bob")
})

test("renders empty textarea when registration has no notes", async () => {
	const { default: ManageNotesPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/notes/page"
	)

	render(<ManageNotesPage />)

	const textarea = screen.getByRole("textbox")
	expect((textarea as HTMLTextAreaElement).value).toBe("")
})

test("save button disabled when notes have not changed", async () => {
	const { default: ManageNotesPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/notes/page"
	)

	render(<ManageNotesPage />)

	const saveButton = screen.getByRole("button", { name: /save/i })
	expect((saveButton as HTMLButtonElement).disabled).toBe(true)
})

test("save button enabled after text changes", async () => {
	const { default: ManageNotesPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/notes/page"
	)

	render(<ManageNotesPage />)

	const textarea = screen.getByRole("textbox")
	fireEvent.change(textarea, { target: { value: "New notes" } })

	const saveButton = screen.getByRole("button", { name: /save/i })
	expect((saveButton as HTMLButtonElement).disabled).toBe(false)
})

test("calls PATCH /api/registration/{id} with correct body on save", async () => {
	;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })

	const { default: ManageNotesPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/notes/page"
	)

	render(<ManageNotesPage />)

	const textarea = screen.getByRole("textbox")
	fireEvent.change(textarea, { target: { value: "Updated notes" } })

	const saveButton = screen.getByRole("button", { name: /save/i })
	fireEvent.click(saveButton)

	await waitFor(() => {
		expect(global.fetch).toHaveBeenCalledWith("/api/registration/42", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ notes: "Updated notes" }),
		})
	})
})

test("shows success toast and navigates to manage URL on success", async () => {
	;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })

	const { default: ManageNotesPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/notes/page"
	)

	render(<ManageNotesPage />)

	const textarea = screen.getByRole("textbox")
	fireEvent.change(textarea, { target: { value: "Updated notes" } })

	const saveButton = screen.getByRole("button", { name: /save/i })
	fireEvent.click(saveButton)

	await waitFor(() => {
		expect(mockToastSuccess).toHaveBeenCalledWith("Notes saved")
	})

	expect(mockPush).toHaveBeenCalledWith("/event/2026-03-01/weeknight/manage")
})

test("shows error toast on API failure", async () => {
	;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 })

	const { default: ManageNotesPage } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/notes/page"
	)

	render(<ManageNotesPage />)

	const textarea = screen.getByRole("textbox")
	fireEvent.change(textarea, { target: { value: "Updated notes" } })

	const saveButton = screen.getByRole("button", { name: /save/i })
	fireEvent.click(saveButton)

	await waitFor(() => {
		expect(mockToastError).toHaveBeenCalledWith("Failed to save notes")
	})
})

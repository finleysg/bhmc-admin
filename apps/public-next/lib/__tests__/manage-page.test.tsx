/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
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
		courses: [
			{
				id: 10,
				name: "East/West",
				number_of_holes: 18,
				gg_id: null,
				color: null,
				holes: [{ id: 100, course_id: 10, hole_number: 3, par: 4 }],
				tees: [],
			},
		],
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

jest.mock("next/navigation", () => ({
	useRouter: () => ({ push: jest.fn() }),
	usePathname: () => "/event/2026-03-01/weeknight/manage",
}))

beforeEach(() => {
	mockClubEvent.mockReset().mockImplementation(() => makeClubEvent())
	mockPlayer.mockReset().mockImplementation(() => ({ id: 1, email: "test@example.com" }))
	mockRegistration.mockReset().mockImplementation(() => makeRegistration())
})

test("renders all 6 menu options when can_choose is true", async () => {
	const { default: ManagePage } = await import("@/app/event/[eventDate]/[eventName]/manage/page")

	render(<ManagePage />)

	expect(screen.getByText("Add Players")).toBeTruthy()
	expect(screen.getByText("Drop Players")).toBeTruthy()
	expect(screen.getByText("Move Group")).toBeTruthy()
	expect(screen.getByText("Replace Player")).toBeTruthy()
	expect(screen.getByText("Add Notes")).toBeTruthy()
	expect(screen.getByText("Get in Skins")).toBeTruthy()
})

test("hides Move Group when can_choose is false", async () => {
	mockClubEvent.mockImplementation(() => makeClubEvent({ can_choose: false }))

	const { default: ManagePage } = await import("@/app/event/[eventDate]/[eventName]/manage/page")

	render(<ManagePage />)

	expect(screen.queryByText("Move Group")).toBeNull()
	expect(screen.getByText("Add Players")).toBeTruthy()
	expect(screen.getByText("Drop Players")).toBeTruthy()
	expect(screen.getByText("Replace Player")).toBeTruthy()
	expect(screen.getByText("Add Notes")).toBeTruthy()
	expect(screen.getByText("Get in Skins")).toBeTruthy()
})

test("all links point to correct URLs", async () => {
	const { default: ManagePage } = await import("@/app/event/[eventDate]/[eventName]/manage/page")

	render(<ManagePage />)

	const links = screen.getAllByRole("link")
	const hrefs = links.map((a) => (a as HTMLAnchorElement).getAttribute("href"))

	expect(hrefs).toContain("/event/2026-03-01/weeknight/manage/add")
	expect(hrefs).toContain("/event/2026-03-01/weeknight/manage/drop")
	expect(hrefs).toContain("/event/2026-03-01/weeknight/manage/move")
	expect(hrefs).toContain("/event/2026-03-01/weeknight/manage/replace")
	expect(hrefs).toContain("/event/2026-03-01/weeknight/manage/notes")
	expect(hrefs).toContain("/event/2026-03-01/weeknight/manage/edit")
})

test("back button links to event detail page", async () => {
	const { default: ManagePage } = await import("@/app/event/[eventDate]/[eventName]/manage/page")

	render(<ManagePage />)

	const backLink = screen.getByRole("link", { name: /back/i })
	expect((backLink as HTMLAnchorElement).getAttribute("href")).toBe("/event/2026-03-01/weeknight")
})

test("all actions remain available when registration window is past", async () => {
	mockClubEvent.mockImplementation(() => makeClubEvent({ registration_window: "past" }))

	const { default: ManagePage } = await import("@/app/event/[eventDate]/[eventName]/manage/page")

	render(<ManagePage />)

	const links = screen.getAllByRole("link")
	const hrefs = links.map((a) => (a as HTMLAnchorElement).getAttribute("href"))
	expect(hrefs).toContain("/event/2026-03-01/weeknight/manage/add")
	expect(hrefs).toContain("/event/2026-03-01/weeknight/manage/drop")
	expect(hrefs).toContain("/event/2026-03-01/weeknight/manage/move")
	expect(hrefs).toContain("/event/2026-03-01/weeknight/manage/replace")
	expect(hrefs).toContain("/event/2026-03-01/weeknight/manage/notes")
	expect(hrefs).toContain("/event/2026-03-01/weeknight/manage/edit")
})

test("displays location text in header", async () => {
	const { default: ManagePage } = await import("@/app/event/[eventDate]/[eventName]/manage/page")

	render(<ManagePage />)

	// Course name "East/West" + shotgun start "3A"
	expect(screen.getByText(/East\/West 3A/)).toBeTruthy()
})

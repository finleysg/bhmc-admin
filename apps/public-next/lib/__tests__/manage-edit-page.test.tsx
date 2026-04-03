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
		can_choose: false,
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
		fees: [
			{
				id: 10,
				event: 1,
				amount: "5.00",
				is_required: true,
				display_order: 1,
				override_amount: null,
				override_restriction: null,
				fee_type: { id: 1, name: "Event Fee", code: "EF", restriction: "" },
			},
		],
		default_tag: null,
		starter_time_interval: 8,
		team_size: null,
		age_restriction: null,
		age_restriction_type: "",
		...overrides,
	}
}

const makeSlotPlayer = (id: number, firstName: string, lastName: string) => ({
	id,
	firstName,
	lastName,
	email: `${firstName.toLowerCase()}@example.com`,
	ghin: null,
	birthDate: null,
	phoneNumber: null,
	tee: null,
	isMember: true,
	lastSeason: null,
})

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
				player: makeSlotPlayer(1, "Alice", "Smith"),
				startingOrder: 0,
				slot: 0,
				status: "R",
				fees: [],
			},
		],
		...overrides,
	}
}

function makeGroupRegistration(): ServerRegistration {
	return makeRegistration({
		slots: [
			{
				id: 101,
				eventId: 1,
				registrationId: 42,
				holeId: 100,
				player: makeSlotPlayer(1, "Alice", "Smith"),
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
				player: makeSlotPlayer(2, "Bob", "Jones"),
				startingOrder: 0,
				slot: 1,
				status: "R",
				fees: [],
			},
		],
	})
}

// --- Mocks ---

const mockClubEvent = jest.fn<ClubEventDetail | null, []>(() => makeClubEvent())
const mockRegistration = jest.fn<ServerRegistration | null, []>(() => null)
const mockContextRegistration = jest.fn<ServerRegistration | null, []>(() => null)
const mockPlayer = jest.fn<{ id: number; email: string } | null, []>(() => ({
	id: 1,
	email: "alice@example.com",
}))
const mockStartEditRegistration = jest.fn()
const mockInitiateStripeSession = jest.fn()
const mockReplace = jest.fn()
const mockRemovePlayer = jest.fn()

jest.mock("../registration/registration-context", () => ({
	useRegistration: () => ({
		clubEvent: mockClubEvent(),
		registration: mockContextRegistration(),
		payment: { id: 0, details: [] },
		error: null,
		existingFees: new Map(),
		mode: "edit",
		startEditRegistration: mockStartEditRegistration,
		initiateStripeSession: mockInitiateStripeSession,
		cancelRegistration: jest.fn(),
		savePayment: jest.fn(),
		setError: jest.fn(),
		updateRegistrationNotes: jest.fn(),
		updateStep: jest.fn(),
		addFee: jest.fn(),
		removeFee: jest.fn(),
		removePlayer: mockRemovePlayer,
		addPlayer: jest.fn(),
	}),
}))

jest.mock("../hooks/use-my-player", () => ({
	useMyPlayer: () => ({ data: mockPlayer() }),
}))

jest.mock("../hooks/use-player-registration", () => ({
	usePlayerRegistration: () => ({
		data: mockRegistration() ? { registration: mockRegistration() } : null,
	}),
}))

jest.mock("../event-utils", () => ({
	getEventUrl: () => "/event/2026-03-01/weeknight",
}))

jest.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
}))

const mockFetch = jest.fn()

beforeEach(() => {
	mockClubEvent.mockReset().mockImplementation(() => makeClubEvent())
	mockPlayer.mockReset().mockImplementation(() => ({ id: 1, email: "alice@example.com" }))
	mockRegistration.mockReset().mockImplementation(() => null)
	mockContextRegistration.mockReset().mockImplementation(() => null)
	mockStartEditRegistration.mockReset()
	mockInitiateStripeSession.mockReset()
	mockReplace.mockReset()
	mockRemovePlayer.mockReset()
	mockFetch.mockReset()
	global.fetch = mockFetch
})

test("shows loading card when context registration is not yet populated", async () => {
	const { default: EditPage } = await import("@/app/event/[eventDate]/[eventName]/manage/edit/page")

	render(<EditPage />)

	expect(screen.getByText("Edit Registration")).toBeTruthy()
	expect(screen.getByText("Loading registration...")).toBeTruthy()
})

test("fetches full registration from NestJS and calls startEditRegistration", async () => {
	const reg = makeRegistration()
	const fullReg = makeRegistration({
		slots: [
			{
				...reg.slots[0],
				fees: [
					{
						id: 1,
						eventFeeId: 10,
						registrationSlotId: 101,
						paymentId: 1,
						isPaid: true,
						amount: "5.00",
					},
				],
			},
		],
	})
	mockRegistration.mockImplementation(() => reg)
	mockFetch.mockResolvedValue({
		ok: true,
		json: () => Promise.resolve(fullReg),
	})

	const { default: EditPage } = await import("@/app/event/[eventDate]/[eventName]/manage/edit/page")

	render(<EditPage />)

	// Should fetch from NestJS API with registration ID
	expect(mockFetch).toHaveBeenCalledWith(`/api/registration/${reg.id}`)

	// Wait for async fetch to resolve
	await new Promise((r) => setTimeout(r, 0))

	expect(mockStartEditRegistration).toHaveBeenCalledWith(fullReg)
	expect(mockInitiateStripeSession).toHaveBeenCalled()
	// Should NOT redirect to /register
	expect(mockReplace).not.toHaveBeenCalled()
})

test("does not initiate when server registration is null", async () => {
	mockRegistration.mockImplementation(() => null)

	const { default: EditPage } = await import("@/app/event/[eventDate]/[eventName]/manage/edit/page")

	render(<EditPage />)

	expect(mockStartEditRegistration).not.toHaveBeenCalled()
	expect(mockInitiateStripeSession).not.toHaveBeenCalled()
})

test("does not initiate when clubEvent is null", async () => {
	mockClubEvent.mockImplementation(() => null)
	mockRegistration.mockImplementation(() => makeRegistration())

	const { default: EditPage } = await import("@/app/event/[eventDate]/[eventName]/manage/edit/page")

	render(<EditPage />)

	expect(mockStartEditRegistration).not.toHaveBeenCalled()
	expect(mockInitiateStripeSession).not.toHaveBeenCalled()
})

test("does not render remove-player buttons in edit mode", async () => {
	const groupReg = makeGroupRegistration()
	mockContextRegistration.mockImplementation(() => groupReg)

	const { default: EditPage } = await import("@/app/event/[eventDate]/[eventName]/manage/edit/page")

	render(<EditPage />)

	// Both players should be visible (horizontal layout renders names for mobile + desktop)
	expect(screen.getAllByText("Alice Smith").length).toBeGreaterThan(0)
	expect(screen.getAllByText("Bob Jones").length).toBeGreaterThan(0)

	// No remove buttons should be rendered (readOnly hides them)
	expect(screen.queryByLabelText("Remove player")).toBeNull()
})

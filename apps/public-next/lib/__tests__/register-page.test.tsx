/**
 * @jest-environment jsdom
 */
import { render, waitFor } from "@testing-library/react"
import React from "react"

// --- Mocks ---

const mockReplace = jest.fn()
const mockSearchParams = new URLSearchParams()
jest.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
	useSearchParams: () => mockSearchParams,
}))

const mockCreateRegistration = jest.fn(() => Promise.resolve())
const mockRegistrationContext = jest.fn(() => ({
	clubEvent: {
		id: 667,
		name: "2026 Season Registration",
		start_date: "2026-01-18",
		event_type: "R",
		can_choose: false,
		registration_type: "O",
		registration_window: "registration",
		status: "S",
		fees: [],
		maximum_signup_group_size: 1,
		minimum_signup_group_size: 1,
	},
	registration: null,
	payment: null,
	mode: "new" as const,
	error: null,
	selectedStart: null,
	selectedSession: null,
	addPlayer: jest.fn(),
	canRegister: jest.fn(() => false),
	cancelRegistration: jest.fn(),
	createRegistration: mockCreateRegistration,
	selectSession: jest.fn(),
	savePayment: jest.fn(),
	setError: jest.fn(),
	updateRegistrationNotes: jest.fn(),
	updateStep: jest.fn(),
}))

jest.mock("../registration/registration-context", () => ({
	useRegistration: () => mockRegistrationContext(),
}))

const mockMyPlayer = jest.fn(() => ({ data: { id: 1, last_season: null as number | null } }))
jest.mock("../hooks/use-my-player", () => ({
	useMyPlayer: () => mockMyPlayer(),
}))

jest.mock("../hooks/use-my-friends", () => ({
	useAddFriend: () => ({ mutate: jest.fn() }),
}))

jest.mock("../event-utils", () => ({
	getEventUrl: () => "/event/2026-01-18/2026-season-registration",
	RegistrationType: { ReturningMembersOnly: "R", MembersOnly: "M", Open: "O" },
}))

beforeEach(() => {
	jest.clearAllMocks()
	mockRegistrationContext.mockImplementation(() => ({
		clubEvent: {
			id: 667,
			name: "2026 Season Registration",
			start_date: "2026-01-18",
			event_type: "R",
			can_choose: false,
			registration_type: "O",
			registration_window: "registration",
			status: "S",
			fees: [],
			maximum_signup_group_size: 1,
			minimum_signup_group_size: 1,
		},
		registration: null,
		payment: null,
		mode: "new" as const,
		error: null,
		selectedStart: null,
		addPlayer: jest.fn(),
		canRegister: jest.fn(() => false),
		cancelRegistration: jest.fn(),
		createRegistration: mockCreateRegistration,
		savePayment: jest.fn(),
		setError: jest.fn(),
		updateRegistrationNotes: jest.fn(),
		selectedSession: null,
		selectSession: jest.fn(),
		updateStep: jest.fn(),
	}))
})

test("calls createRegistration for non-choice events when registration is null", async () => {
	const { default: RegisterPage } = await import(
		"@/app/event/[eventDate]/[eventName]/register/page"
	)

	render(<RegisterPage />)

	await waitFor(() => {
		expect(mockCreateRegistration).toHaveBeenCalled()
	})
	expect(mockReplace).not.toHaveBeenCalled()
})

test("redirects to event page for can_choose events when registration is null", async () => {
	mockRegistrationContext.mockImplementation(() => ({
		clubEvent: {
			id: 1,
			name: "Weeknight",
			start_date: "2026-03-01",
			event_type: "N",
			can_choose: true,
			registration_type: "M",
			registration_window: "registration",
			status: "S",
			fees: [],
			maximum_signup_group_size: 5,
			minimum_signup_group_size: 1,
		},
		registration: null,
		payment: null,
		mode: "new" as const,
		error: null,
		selectedStart: null,
		addPlayer: jest.fn(),
		canRegister: jest.fn(() => false),
		cancelRegistration: jest.fn(),
		createRegistration: mockCreateRegistration,
		savePayment: jest.fn(),
		setError: jest.fn(),
		updateRegistrationNotes: jest.fn(),
		selectedSession: null,
		selectSession: jest.fn(),
		updateStep: jest.fn(),
	}))

	const { default: RegisterPage } = await import(
		"@/app/event/[eventDate]/[eventName]/register/page"
	)

	render(<RegisterPage />)

	await waitFor(() => {
		expect(mockReplace).toHaveBeenCalledWith("/event/2026-01-18/2026-season-registration")
	})
	expect(mockCreateRegistration).not.toHaveBeenCalled()
})

test("does not call createRegistration for non-returning member on returning-members-only event", async () => {
	const mockSetError = jest.fn()
	mockMyPlayer.mockImplementation(() => ({ data: { id: 1, last_season: null } }))
	mockRegistrationContext.mockImplementation(() => ({
		clubEvent: {
			id: 667,
			name: "2026 Season Registration",
			start_date: "2026-01-18",
			event_type: "R",
			can_choose: false,
			registration_type: "R",
			registration_window: "registration",
			status: "S",
			season: 2026,
			fees: [],
			maximum_signup_group_size: 1,
			minimum_signup_group_size: 1,
		},
		registration: null,
		payment: null,
		mode: "new" as const,
		error: null,
		selectedStart: null,
		addPlayer: jest.fn(),
		canRegister: jest.fn(() => false),
		cancelRegistration: jest.fn(),
		createRegistration: mockCreateRegistration,
		savePayment: jest.fn(),
		setError: mockSetError,
		updateRegistrationNotes: jest.fn(),
		selectedSession: null,
		selectSession: jest.fn(),
		updateStep: jest.fn(),
	}))

	const { default: RegisterPage } = await import(
		"@/app/event/[eventDate]/[eventName]/register/page"
	)

	render(<RegisterPage />)

	await waitFor(() => {
		expect(mockSetError).toHaveBeenCalledWith("This event is restricted to returning members.")
	})
	expect(mockCreateRegistration).not.toHaveBeenCalled()
})

test("calls createRegistration for returning member on returning-members-only event", async () => {
	mockMyPlayer.mockImplementation(() => ({ data: { id: 1, last_season: 2025 } }))
	mockRegistrationContext.mockImplementation(() => ({
		clubEvent: {
			id: 667,
			name: "2026 Season Registration",
			start_date: "2026-01-18",
			event_type: "R",
			can_choose: false,
			registration_type: "R",
			registration_window: "registration",
			status: "S",
			season: 2026,
			fees: [],
			maximum_signup_group_size: 1,
			minimum_signup_group_size: 1,
		},
		registration: null,
		payment: null,
		mode: "new" as const,
		error: null,
		selectedStart: null,
		addPlayer: jest.fn(),
		canRegister: jest.fn(() => false),
		cancelRegistration: jest.fn(),
		createRegistration: mockCreateRegistration,
		savePayment: jest.fn(),
		setError: jest.fn(),
		updateRegistrationNotes: jest.fn(),
		selectedSession: null,
		selectSession: jest.fn(),
		updateStep: jest.fn(),
	}))

	const { default: RegisterPage } = await import(
		"@/app/event/[eventDate]/[eventName]/register/page"
	)

	render(<RegisterPage />)

	await waitFor(() => {
		expect(mockCreateRegistration).toHaveBeenCalled()
	})
})

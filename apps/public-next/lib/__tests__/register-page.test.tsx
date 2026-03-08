/**
 * @jest-environment jsdom
 */
import { render, waitFor } from "@testing-library/react"
import React from "react"

// --- Mocks ---

const mockReplace = jest.fn()
jest.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
}))

const mockCreateRegistration = jest.fn(() => Promise.resolve())
const mockRegistrationContext = jest.fn(() => ({
	clubEvent: {
		id: 667,
		name: "2026 Season Registration",
		start_date: "2026-01-18",
		event_type: "R",
		can_choose: false,
		registration_type: "R",
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
	updateStep: jest.fn(),
}))

jest.mock("../registration/registration-context", () => ({
	useRegistration: () => mockRegistrationContext(),
}))

jest.mock("../hooks/use-my-player", () => ({
	useMyPlayer: () => ({ data: { id: 1 } }),
}))

jest.mock("../hooks/use-my-friends", () => ({
	useAddFriend: () => ({ mutate: jest.fn() }),
}))

jest.mock("../event-utils", () => ({
	getEventUrl: () => "/event/2026-01-18/2026-season-registration",
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
			registration_type: "R",
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

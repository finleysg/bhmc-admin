/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"

import type { ClubEventDetail } from "../types"
import type { RegistrationMode, ServerPayment, ServerRegistration } from "../registration/types"

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
		courseId: null,
		signedUpBy: "test@example.com",
		expires: new Date(Date.now() + 300000).toISOString(),
		notes: null,
		createdDate: "2026-03-01T00:00:00",
		slots: [
			{
				id: 101,
				eventId: 1,
				registrationId: 42,
				holeId: null,
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
		],
		...overrides,
	}
}

function makePayment(overrides: Partial<ServerPayment> = {}): ServerPayment {
	return {
		id: 0,
		eventId: 1,
		userId: 1,
		paymentCode: "",
		paymentKey: null,
		paymentAmount: null,
		transactionFee: null,
		notificationType: null,
		confirmed: false,
		details: [],
		...overrides,
	}
}

// --- Mocks ---

const mockReplace = jest.fn()
jest.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
}))

const mockSavePayment = jest.fn<Promise<ServerPayment | undefined>, []>(() =>
	Promise.resolve(undefined),
)
const mockCompleteRegistration = jest.fn()
const mockSetError = jest.fn()
const mockUpdateStep = jest.fn()
const mockCancelRegistration = jest.fn(() => Promise.resolve())

const mockRegistrationContext = jest.fn(() => ({
	clubEvent: makeClubEvent(),
	currentStep: { name: "review", order: 3, title: "Review Registration Details" },
	registration: makeRegistration(),
	payment: makePayment(),
	mode: "new" as RegistrationMode,
	error: null,
	selectedStart: null,
	setError: mockSetError,
	updateStep: mockUpdateStep,
	savePayment: mockSavePayment,
	completeRegistration: mockCompleteRegistration,
	cancelRegistration: mockCancelRegistration,
}))

jest.mock("../registration/registration-context", () => ({
	useRegistration: () => mockRegistrationContext(),
}))

jest.mock("../event-utils", () => ({
	getEventUrl: () => "/event/2026-03-01/weeknight",
}))

jest.mock("sonner", () => ({
	toast: { error: jest.fn(), success: jest.fn() },
}))

beforeEach(() => {
	jest.clearAllMocks()
	mockRegistrationContext.mockImplementation(() => ({
		clubEvent: makeClubEvent(),
		currentStep: { name: "review", order: 3, title: "Review Registration Details" },
		registration: makeRegistration(),
		payment: makePayment(),
		mode: "new" as RegistrationMode,
		error: null,
		selectedStart: null,
		setError: mockSetError,
		updateStep: mockUpdateStep,
		savePayment: mockSavePayment,
		completeRegistration: mockCompleteRegistration,
		cancelRegistration: mockCancelRegistration,
	}))
})

test("navigates back to /register in new mode", async () => {
	const { default: ReviewPage } = await import("@/app/event/[eventDate]/[eventName]/review/page")

	render(<ReviewPage />)

	const backButton = screen.getByRole("button", { name: "Back" })
	fireEvent.click(backButton)

	expect(mockReplace).toHaveBeenCalledWith("/event/2026-03-01/weeknight/register")
})

test("navigates back to /manage/edit in edit mode", async () => {
	mockRegistrationContext.mockImplementation(() => ({
		clubEvent: makeClubEvent(),
		currentStep: { name: "review", order: 3, title: "Review Registration Details" },
		registration: makeRegistration(),
		payment: makePayment(),
		mode: "edit" as RegistrationMode,
		error: null,
		selectedStart: null,
		setError: mockSetError,
		updateStep: mockUpdateStep,
		savePayment: mockSavePayment,
		completeRegistration: mockCompleteRegistration,
		cancelRegistration: mockCancelRegistration,
	}))

	const { default: ReviewPage } = await import("@/app/event/[eventDate]/[eventName]/review/page")

	render(<ReviewPage />)

	const backButton = screen.getByRole("button", { name: "Back" })
	fireEvent.click(backButton)

	expect(mockReplace).toHaveBeenCalledWith("/event/2026-03-01/weeknight/manage/edit")
})

test("calls savePayment and navigates to payment when amount > 0", async () => {
	const payment = makePayment({
		details: [
			{
				id: 0,
				eventFeeId: 10,
				registrationSlotId: 101,
				paymentId: 0,
				isPaid: false,
				amount: 5,
			},
		],
	})
	mockSavePayment.mockResolvedValue({ ...payment, id: 42 })
	mockRegistrationContext.mockImplementation(() => ({
		clubEvent: makeClubEvent(),
		currentStep: { name: "review", order: 3, title: "Review Registration Details" },
		registration: makeRegistration(),
		payment,
		mode: "new" as RegistrationMode,
		error: null,
		selectedStart: null,
		setError: mockSetError,
		updateStep: mockUpdateStep,
		savePayment: mockSavePayment,
		completeRegistration: mockCompleteRegistration,
		cancelRegistration: mockCancelRegistration,
	}))

	const { default: ReviewPage } = await import("@/app/event/[eventDate]/[eventName]/review/page")

	render(<ReviewPage />)

	const continueButton = screen.getByRole("button", { name: "Continue" })
	fireEvent.click(continueButton)

	await waitFor(() => {
		expect(mockSavePayment).toHaveBeenCalled()
	})

	await waitFor(() => {
		expect(mockReplace).toHaveBeenCalledWith("/event/2026-03-01/weeknight/42/payment")
	})
})

test("calls savePayment and completes when amount is 0", async () => {
	mockSavePayment.mockResolvedValue(makePayment())
	mockRegistrationContext.mockImplementation(() => ({
		clubEvent: makeClubEvent(),
		currentStep: { name: "review", order: 3, title: "Review Registration Details" },
		registration: makeRegistration(),
		payment: makePayment({ details: [] }),
		mode: "new" as RegistrationMode,
		error: null,
		selectedStart: null,
		setError: mockSetError,
		updateStep: mockUpdateStep,
		savePayment: mockSavePayment,
		completeRegistration: mockCompleteRegistration,
		cancelRegistration: mockCancelRegistration,
	}))

	const { default: ReviewPage } = await import("@/app/event/[eventDate]/[eventName]/review/page")

	render(<ReviewPage />)

	const continueButton = screen.getByRole("button", { name: "Continue" })
	fireEvent.click(continueButton)

	await waitFor(() => {
		expect(mockSavePayment).toHaveBeenCalled()
	})

	await waitFor(() => {
		expect(mockCompleteRegistration).toHaveBeenCalled()
	})
})

test("redirects when registration is missing", async () => {
	mockRegistrationContext.mockImplementation(() => ({
		clubEvent: makeClubEvent(),
		currentStep: { name: "review", order: 3, title: "Review Registration Details" },
		registration: null as unknown as ServerRegistration,
		payment: makePayment(),
		mode: "new" as RegistrationMode,
		error: null,
		selectedStart: null,
		setError: mockSetError,
		updateStep: mockUpdateStep,
		savePayment: mockSavePayment,
		completeRegistration: mockCompleteRegistration,
		cancelRegistration: mockCancelRegistration,
	}))

	const { default: ReviewPage } = await import("@/app/event/[eventDate]/[eventName]/review/page")

	render(<ReviewPage />)

	await waitFor(() => {
		expect(mockReplace).toHaveBeenCalledWith("/event/2026-03-01/weeknight")
	})
})

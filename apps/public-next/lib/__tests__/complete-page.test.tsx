/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react"
import React from "react"

// Mock useCurrentPaymentAmount (from the payment layout)
jest.mock("../../app/event/[eventDate]/[eventName]/[paymentId]/layout", () => ({
	useCurrentPaymentAmount: () => ({
		amount: { subtotal: 25.0, transactionFee: 1.05, total: 26.05 },
	}),
}))

// Mock useRegistration
jest.mock("../registration/registration-context", () => ({
	useRegistration: () => ({
		clubEvent: { id: 1, name: "Weeknight", start_date: "2026-03-01", season: 2026 },
		completeRegistration: jest.fn(),
	}),
}))

// Mock useAuth
jest.mock("../auth-context", () => ({
	useAuth: () => ({
		user: { firstName: "Test", lastName: "User", email: "test@example.com" },
	}),
}))

// Mock next/navigation
const mockSearchParams = new URLSearchParams("payment_intent_client_secret=pi_secret_test")
jest.mock("next/navigation", () => ({
	useRouter: () => ({ replace: jest.fn() }),
	useSearchParams: () => mockSearchParams,
}))

// Mock @stripe/react-stripe-js
const mockRetrievePaymentIntent = jest.fn()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseStripe = jest.fn(() => ({ retrievePaymentIntent: mockRetrievePaymentIntent }) as any)
jest.mock("@stripe/react-stripe-js", () => ({
	useStripe: () => mockUseStripe(),
}))

beforeEach(() => {
	mockRetrievePaymentIntent.mockReset()
	mockUseStripe.mockReturnValue({ retrievePaymentIntent: mockRetrievePaymentIntent })
})

test("shows success message when payment succeeded", async () => {
	mockRetrievePaymentIntent.mockResolvedValue({
		paymentIntent: { status: "succeeded" },
	})

	const { default: CompletePage } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/complete/page"
	)

	render(<CompletePage />)

	await waitFor(() => {
		expect(screen.getByText(/payment complete/i)).toBeTruthy()
	})

	expect(screen.getByText(/\$26\.05/)).toBeTruthy()
})

test("shows user email in confirmation on success", async () => {
	mockRetrievePaymentIntent.mockResolvedValue({
		paymentIntent: { status: "succeeded" },
	})

	const { default: CompletePage } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/complete/page"
	)

	render(<CompletePage />)

	await waitFor(() => {
		expect(screen.getByText(/test@example\.com/)).toBeTruthy()
	})
})

test("shows processing message", async () => {
	mockRetrievePaymentIntent.mockResolvedValue({
		paymentIntent: { status: "processing" },
	})

	const { default: CompletePage } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/complete/page"
	)

	render(<CompletePage />)

	await waitFor(() => {
		expect(screen.getByText(/payment processing/i)).toBeTruthy()
	})

	expect(screen.getByText(/being processed by your bank/i)).toBeTruthy()
})

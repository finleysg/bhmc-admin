/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import React from "react"

// Mock useCurrentPaymentAmount (from the payment layout)
jest.mock("../../app/event/[eventDate]/[eventName]/[paymentId]/layout", () => ({
	useCurrentPaymentAmount: () => ({
		amount: { subtotal: 25.0, transactionFee: 1.05, total: 26.05 },
	}),
}))

// Mock useRegistration
const mockCreatePaymentIntent = jest.fn()
const mockUpdateStep = jest.fn()
jest.mock("../registration/registration-context", () => ({
	useRegistration: () => ({
		currentStep: { name: "payment", order: 4, title: "Submit Payment" },
		registration: { id: 1, selectedStart: "10:00 AM", expires: null },
		payment: { id: 42 },
		clubEvent: { id: 1, name: "Weeknight", start_date: "2026-03-01", season: 2026 },
		mode: "new",
		error: null,
		setError: jest.fn(),
		createPaymentIntent: mockCreatePaymentIntent,
		updateStep: mockUpdateStep,
		cancelRegistration: jest.fn(),
		completeRegistration: jest.fn(),
	}),
}))

// Mock useAuth
jest.mock("../auth-context", () => ({
	useAuth: () => ({
		user: { name: "Test User", email: "test@example.com" },
	}),
}))

// Mock next/navigation
const mockReplace = jest.fn()
jest.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
	useParams: () => ({ paymentId: "42" }),
}))

// Mock @stripe/react-stripe-js
const mockUseStripe = jest.fn(() => ({}))
const mockUseElements = jest.fn(() => ({}))
jest.mock("@stripe/react-stripe-js", () => ({
	useStripe: () => mockUseStripe(),
	useElements: () => mockUseElements(),
	PaymentElement: (props: Record<string, unknown>) => (
		<div data-testid="payment-element" data-options={JSON.stringify(props.options)} />
	),
}))

beforeEach(() => {
	mockCreatePaymentIntent.mockReset()
	mockUpdateStep.mockReset()
	mockReplace.mockReset()
	mockUseStripe.mockReturnValue({})
	mockUseElements.mockReturnValue({})
})

test("renders PaymentElement and submit button", async () => {
	const { default: PaymentPage } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/payment/page"
	)

	render(<PaymentPage />)

	expect(screen.getByTestId("payment-element")).toBeTruthy()
	expect(screen.getByRole("button", { name: /submit payment/i })).toBeTruthy()
})

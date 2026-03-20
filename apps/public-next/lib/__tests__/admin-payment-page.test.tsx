/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"

// Mock useAdminPayment (from the admin payment layout)
jest.mock("../../app/registration/[registrationId]/payment/[paymentId]/layout", () => ({
	useAdminPayment: () => ({
		amount: { subtotal: 25.0, transactionFee: 1.05, total: 26.05 },
		data: {
			paymentId: 2,
			registrationId: 1,
			eventId: 100,
			eventName: "Summer Open",
			eventDate: "2025-06-15",
		},
	}),
}))

// Mock useAuth
jest.mock("../auth-context", () => ({
	useAuth: () => ({
		user: { firstName: "Test", lastName: "User", email: "test@example.com" },
	}),
}))

// Mock @stripe/react-stripe-js
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
const mockUseStripe = jest.fn(() => ({}) as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
const mockUseElements = jest.fn(() => ({}) as any)
jest.mock("@stripe/react-stripe-js", () => ({
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	useStripe: () => mockUseStripe(),
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	useElements: () => mockUseElements(),
	PaymentElement: (props: Record<string, unknown>) => (
		<div data-testid="payment-element" data-options={JSON.stringify(props.options)} />
	),
}))

const originalFetch = globalThis.fetch

beforeEach(() => {
	mockUseStripe.mockReturnValue({})
	mockUseElements.mockReturnValue({})
})

afterEach(() => {
	globalThis.fetch = originalFetch
})

test("renders event name, date, and amount due", async () => {
	const { default: AdminPaymentPage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/page"
	)

	render(<AdminPaymentPage />)

	expect(screen.getByText(/summer open/i)).toBeTruthy()
	expect(screen.getByText(/2025-06-15/)).toBeTruthy()
	expect(screen.getByText(/\$26\.05/)).toBeTruthy()
})

test("renders Stripe PaymentElement", async () => {
	const { default: AdminPaymentPage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/page"
	)

	render(<AdminPaymentPage />)

	expect(screen.getByTestId("payment-element")).toBeTruthy()
})

test("submit button disabled when Stripe not loaded", async () => {
	mockUseStripe.mockReturnValue(null)
	mockUseElements.mockReturnValue(null)

	const { default: AdminPaymentPage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/page"
	)

	render(<AdminPaymentPage />)

	const button = screen.getByRole("button", { name: /submit payment/i })
	expect((button as HTMLButtonElement).disabled).toBe(true)
})

test("submit flow: calls elements.submit, fetches payment-intent, calls stripe.confirmPayment", async () => {
	const mockSubmit = jest.fn().mockResolvedValue({})
	const mockConfirmPayment = jest.fn().mockResolvedValue({})

	mockUseStripe.mockReturnValue({ confirmPayment: mockConfirmPayment })
	mockUseElements.mockReturnValue({ submit: mockSubmit })

	globalThis.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: () => Promise.resolve({ client_secret: "pi_test_secret" }),
	})

	const { default: AdminPaymentPage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/page"
	)

	render(<AdminPaymentPage />)

	fireEvent.click(screen.getByRole("button", { name: /submit payment/i }))

	await waitFor(() => {
		expect(mockConfirmPayment).toHaveBeenCalled()
	})

	expect(mockSubmit).toHaveBeenCalled()
	expect(globalThis.fetch).toHaveBeenCalledWith(
		"/api/payments/2/payment-intent",
		expect.objectContaining({
			method: "POST",
			body: JSON.stringify({ eventId: 100, registrationId: 1 }),
		}),
	)

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
	const callArgs = mockConfirmPayment.mock.calls[0]![0]
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	expect(callArgs.clientSecret).toBe("pi_test_secret")
})

test("shows Processing... during submission", async () => {
	const mockSubmit = jest.fn().mockReturnValue(new Promise(() => {}))
	mockUseStripe.mockReturnValue({ confirmPayment: jest.fn() })
	mockUseElements.mockReturnValue({ submit: mockSubmit })

	const { default: AdminPaymentPage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/page"
	)

	render(<AdminPaymentPage />)

	fireEvent.click(screen.getByRole("button", { name: /submit payment/i }))

	await waitFor(() => {
		expect(screen.getByText(/processing\.\.\./i)).toBeTruthy()
	})
})

test("handles Stripe validation errors", async () => {
	const mockSubmit = jest.fn().mockResolvedValue({ error: { message: "Card number is invalid" } })
	mockUseStripe.mockReturnValue({ confirmPayment: jest.fn() })
	mockUseElements.mockReturnValue({ submit: mockSubmit })

	const { default: AdminPaymentPage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/page"
	)

	render(<AdminPaymentPage />)

	fireEvent.click(screen.getByRole("button", { name: /submit payment/i }))

	await waitFor(() => {
		expect(screen.getByText(/card number is invalid/i)).toBeTruthy()
	})
})

test("handles confirmPayment error", async () => {
	const mockSubmit = jest.fn().mockResolvedValue({})
	const mockConfirmPayment = jest
		.fn()
		.mockResolvedValue({ error: { message: "Your card was declined" } })

	mockUseStripe.mockReturnValue({ confirmPayment: mockConfirmPayment })
	mockUseElements.mockReturnValue({ submit: mockSubmit })

	globalThis.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: () => Promise.resolve({ client_secret: "pi_test_secret" }),
	})

	const { default: AdminPaymentPage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/page"
	)

	render(<AdminPaymentPage />)

	fireEvent.click(screen.getByRole("button", { name: /submit payment/i }))

	await waitFor(() => {
		expect(screen.getByText(/your card was declined/i)).toBeTruthy()
	})

	const button = screen.getByRole("button", { name: /submit payment/i })
	expect((button as HTMLButtonElement).disabled).toBe(false)
})

test("handles payment intent fetch failure", async () => {
	const mockSubmit = jest.fn().mockResolvedValue({})
	mockUseStripe.mockReturnValue({ confirmPayment: jest.fn() })
	mockUseElements.mockReturnValue({ submit: mockSubmit })

	globalThis.fetch = jest.fn().mockResolvedValue({ ok: false })

	const { default: AdminPaymentPage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/page"
	)

	render(<AdminPaymentPage />)

	fireEvent.click(screen.getByRole("button", { name: /submit payment/i }))

	await waitFor(() => {
		expect(screen.getByText(/failed to create payment intent/i)).toBeTruthy()
	})
})

test("handles unexpected errors during payment submission", async () => {
	const mockSubmit = jest.fn().mockResolvedValue({})
	mockUseStripe.mockReturnValue({ confirmPayment: jest.fn() })
	mockUseElements.mockReturnValue({ submit: mockSubmit })

	globalThis.fetch = jest.fn().mockRejectedValue(new Error("Network error"))

	const { default: AdminPaymentPage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/page"
	)

	render(<AdminPaymentPage />)

	fireEvent.click(screen.getByRole("button", { name: /submit payment/i }))

	await waitFor(() => {
		expect(screen.getByText(/an unexpected error occurred/i)).toBeTruthy()
	})
})

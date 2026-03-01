/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
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
const mockSuppressBeforeUnload = jest.fn()
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
		suppressBeforeUnload: mockSuppressBeforeUnload,
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

beforeEach(() => {
	mockCreatePaymentIntent.mockReset()
	mockUpdateStep.mockReset()
	mockReplace.mockReset()
	mockSuppressBeforeUnload.mockReset()
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

test("displays the amount due", async () => {
	const { default: PaymentPage } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/payment/page"
	)

	render(<PaymentPage />)

	expect(screen.getByText(/\$26\.05/)).toBeTruthy()
})

test("executes full submit flow on button click", async () => {
	const mockSubmit = jest.fn().mockResolvedValue({})
	const mockConfirmPayment = jest.fn().mockResolvedValue({})

	mockUseStripe.mockReturnValue({ confirmPayment: mockConfirmPayment })
	mockUseElements.mockReturnValue({ submit: mockSubmit })
	mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_test_secret" })

	const { default: PaymentPage } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/payment/page"
	)

	render(<PaymentPage />)

	fireEvent.click(screen.getByRole("button", { name: /submit payment/i }))

	await waitFor(() => {
		expect(mockConfirmPayment).toHaveBeenCalled()
	})

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
	const callArgs = mockConfirmPayment.mock.calls[0]![0]
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	expect(callArgs.clientSecret).toBe("pi_test_secret")
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	expect(callArgs.elements).toBeTruthy()
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	expect(callArgs.confirmParams.return_url).toBeDefined()
})

test("stops flow when elements validation fails", async () => {
	const mockSubmit = jest.fn().mockResolvedValue({ error: { message: "Card declined" } })

	mockUseStripe.mockReturnValue({ confirmPayment: jest.fn() })
	mockUseElements.mockReturnValue({ submit: mockSubmit })

	const { default: PaymentPage } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/payment/page"
	)

	render(<PaymentPage />)

	fireEvent.click(screen.getByRole("button", { name: /submit payment/i }))

	await waitFor(() => {
		expect(mockSubmit).toHaveBeenCalled()
	})

	expect(mockCreatePaymentIntent).not.toHaveBeenCalled()
})

test("back button navigates to review", async () => {
	const { default: PaymentPage } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/payment/page"
	)

	render(<PaymentPage />)

	fireEvent.click(screen.getByRole("button", { name: /back/i }))

	expect(mockUpdateStep).toHaveBeenCalled()
	expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("/review"))
})

test("submit button disabled when stripe/elements not loaded", async () => {
	mockUseStripe.mockReturnValue(null)
	mockUseElements.mockReturnValue(null)

	const { default: PaymentPage } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/payment/page"
	)

	render(<PaymentPage />)

	const button = screen.getByRole("button", { name: /submit payment/i })
	expect((button as HTMLButtonElement).disabled).toBe(true)
})

test("adds beforeunload handler during processing", async () => {
	const addSpy = jest.spyOn(window, "addEventListener")
	const removeSpy = jest.spyOn(window, "removeEventListener")

	// Make submit hang so processing stays true
	const mockSubmit = jest.fn().mockReturnValue(new Promise(() => {}))
	mockUseStripe.mockReturnValue({ confirmPayment: jest.fn() })
	mockUseElements.mockReturnValue({ submit: mockSubmit })

	const { default: PaymentPage } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/payment/page"
	)

	render(<PaymentPage />)

	fireEvent.click(screen.getByRole("button", { name: /submit payment/i }))

	await waitFor(() => {
		expect(addSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function))
	})

	addSpy.mockRestore()
	removeSpy.mockRestore()
})

test("calls suppressBeforeUnload before confirmPayment", async () => {
	const callOrder: string[] = []
	const mockSubmit = jest.fn().mockResolvedValue({})
	const mockConfirmPayment = jest.fn().mockImplementation(() => {
		callOrder.push("confirmPayment")
		return Promise.resolve({})
	})
	mockSuppressBeforeUnload.mockImplementation(() => {
		callOrder.push("suppressBeforeUnload")
	})

	mockUseStripe.mockReturnValue({ confirmPayment: mockConfirmPayment })
	mockUseElements.mockReturnValue({ submit: mockSubmit })
	mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_test_secret" })

	const { default: PaymentPage } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/payment/page"
	)

	render(<PaymentPage />)

	fireEvent.click(screen.getByRole("button", { name: /submit payment/i }))

	await waitFor(() => {
		expect(mockConfirmPayment).toHaveBeenCalled()
	})

	expect(mockSuppressBeforeUnload).toHaveBeenCalled()
	expect(callOrder.indexOf("suppressBeforeUnload")).toBeLessThan(
		callOrder.indexOf("confirmPayment"),
	)
})

test("beforeunload handler does not preventDefault after payment submitted", async () => {
	const addSpy = jest.spyOn(window, "addEventListener")

	// Make confirmPayment hang to keep the component in "submitted" state
	const mockSubmit = jest.fn().mockResolvedValue({})
	const mockConfirmPayment = jest.fn().mockReturnValue(new Promise(() => {}))

	mockUseStripe.mockReturnValue({ confirmPayment: mockConfirmPayment })
	mockUseElements.mockReturnValue({ submit: mockSubmit })
	mockCreatePaymentIntent.mockResolvedValue({ client_secret: "pi_test_secret" })

	const { default: PaymentPage } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/payment/page"
	)

	render(<PaymentPage />)

	fireEvent.click(screen.getByRole("button", { name: /submit payment/i }))

	await waitFor(() => {
		expect(mockConfirmPayment).toHaveBeenCalled()
	})

	// Find the beforeunload handler added by the payment page
	const beforeunloadCall = addSpy.mock.calls.find(
		(c: [string, ...unknown[]]) => c[0] === "beforeunload",
	)
	expect(beforeunloadCall).toBeDefined()

	const handler = beforeunloadCall![1] as (e: BeforeUnloadEvent) => void
	const event = new Event("beforeunload") as BeforeUnloadEvent
	const preventDefaultSpy = jest.spyOn(event, "preventDefault")

	handler(event)

	// redirectingRef.current is true, so preventDefault should NOT be called
	expect(preventDefaultSpy).not.toHaveBeenCalled()

	addSpy.mockRestore()
})

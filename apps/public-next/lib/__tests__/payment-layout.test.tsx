/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import React from "react"

// Mock useStripeAmount
const mockUseStripeAmount = jest.fn()
jest.mock("../hooks/use-stripe-amount", () => ({
	useStripeAmount: (...args: unknown[]) => mockUseStripeAmount(...args),
}))

// Mock useRegistration
const mockInitiateStripeSession = jest.fn()
jest.mock("../registration/registration-context", () => ({
	useRegistration: () => ({
		payment: { id: 42 },
		stripeClientSession: "cuss_test_secret",
		initiateStripeSession: mockInitiateStripeSession,
	}),
}))

// Mock next/navigation
jest.mock("next/navigation", () => ({
	useParams: () => ({ paymentId: "42" }),
}))

// Mock @stripe/react-stripe-js — capture the props passed to Elements
let capturedElementsProps: Record<string, unknown> = {}
jest.mock("@stripe/react-stripe-js", () => ({
	Elements: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => {
		capturedElementsProps = props
		return <div data-testid="stripe-elements">{children}</div>
	},
}))

// Mock @stripe/stripe-js
jest.mock("@stripe/stripe-js", () => ({
	loadStripe: () => Promise.resolve({}),
}))

beforeEach(() => {
	capturedElementsProps = {}
	mockUseStripeAmount.mockReset()
	mockInitiateStripeSession.mockReset()
})

test("renders Elements provider when stripe amount loads", async () => {
	mockUseStripeAmount.mockReturnValue({
		data: {
			amountDue: { subtotal: 25.0, transactionFee: 1.05, total: 26.05 },
			amountCents: 2605,
		},
		isPending: false,
		isError: false,
	})

	const { default: PaymentLayout } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/layout"
	)

	render(<PaymentLayout><div>child content</div></PaymentLayout>)

	expect(screen.getByTestId("stripe-elements")).toBeTruthy()
	expect(screen.getByText("child content")).toBeTruthy()
	expect(capturedElementsProps.options).toEqual(
		expect.objectContaining({
			mode: "payment",
			currency: "usd",
			amount: 2605,
		}),
	)
})

test("calls initiateStripeSession on mount", async () => {
	mockUseStripeAmount.mockReturnValue({
		data: {
			amountDue: { subtotal: 25.0, transactionFee: 1.05, total: 26.05 },
			amountCents: 2605,
		},
		isPending: false,
		isError: false,
	})

	const { default: PaymentLayout } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/layout"
	)

	render(<PaymentLayout><div>child</div></PaymentLayout>)

	expect(mockInitiateStripeSession).toHaveBeenCalled()
})

test("shows nothing while stripe amount is pending", async () => {
	mockUseStripeAmount.mockReturnValue({
		data: undefined,
		isPending: true,
		isError: false,
	})

	const { default: PaymentLayout } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/layout"
	)

	const { container } = render(<PaymentLayout><div>child content</div></PaymentLayout>)

	expect(screen.queryByTestId("stripe-elements")).toBeNull()
	expect(screen.queryByText("child content")).toBeNull()
	expect(container.innerHTML).toBe("")
})

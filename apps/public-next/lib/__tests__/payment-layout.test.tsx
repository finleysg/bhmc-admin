/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import React from "react"

// Mock useStripeAmount
const mockUseStripeAmount = jest.fn()
jest.mock("../hooks/use-stripe-amount", () => ({
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	useStripeAmount: (...args: unknown[]) => mockUseStripeAmount(...args),
}))

// Mock useAuth
const mockUseAuth = jest.fn()
jest.mock("../auth-context", () => ({
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	useAuth: () => mockUseAuth(),
}))

// Mock useCustomerSession
const mockUseCustomerSession = jest.fn()
jest.mock("../hooks/use-customer-session", () => ({
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	useCustomerSession: (...args: unknown[]) => mockUseCustomerSession(...args),
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
	mockUseAuth.mockReset()
	mockUseCustomerSession.mockReset()

	mockUseAuth.mockReturnValue({ isAuthenticated: true })
	mockUseCustomerSession.mockReturnValue({
		data: "cuss_test_secret",
		isPending: false,
	})
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

	render(
		<PaymentLayout>
			<div>child content</div>
		</PaymentLayout>,
	)

	expect(screen.getByTestId("stripe-elements")).toBeTruthy()
	expect(screen.getByText("child content")).toBeTruthy()
	expect(capturedElementsProps.options).toEqual(
		expect.objectContaining({
			mode: "payment",
			currency: "usd",
			amount: 2605,
			customerSessionClientSecret: "cuss_test_secret",
		}),
	)
})

test("calls useCustomerSession with isAuthenticated", async () => {
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

	render(
		<PaymentLayout>
			<div>child</div>
		</PaymentLayout>,
	)

	expect(mockUseCustomerSession).toHaveBeenCalledWith(true)
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

	const { container } = render(
		<PaymentLayout>
			<div>child content</div>
		</PaymentLayout>,
	)

	expect(screen.queryByTestId("stripe-elements")).toBeNull()
	expect(screen.queryByText("child content")).toBeNull()
	expect(container.innerHTML).toBe("")
})

test("shows nothing while customer session is pending for authenticated user", async () => {
	mockUseCustomerSession.mockReturnValue({
		data: undefined,
		isPending: true,
	})
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

	const { container } = render(
		<PaymentLayout>
			<div>child content</div>
		</PaymentLayout>,
	)

	expect(screen.queryByTestId("stripe-elements")).toBeNull()
	expect(container.innerHTML).toBe("")
})

test("provides amount data via useCurrentPaymentAmount", async () => {
	mockUseStripeAmount.mockReturnValue({
		data: {
			amountDue: { subtotal: 25.0, transactionFee: 1.05, total: 26.05 },
			amountCents: 2605,
		},
		isPending: false,
		isError: false,
	})

	const { default: PaymentLayout, useCurrentPaymentAmount } = await import(
		"@/app/event/[eventDate]/[eventName]/[paymentId]/layout"
	)

	function ChildComponent() {
		const { amount } = useCurrentPaymentAmount()
		return <div data-testid="amount">{JSON.stringify(amount)}</div>
	}

	render(
		<PaymentLayout>
			<ChildComponent />
		</PaymentLayout>,
	)

	const amountEl = screen.getByTestId("amount")
	expect(JSON.parse(amountEl.textContent ?? "")).toEqual({
		subtotal: 25.0,
		transactionFee: 1.05,
		total: 26.05,
	})
})

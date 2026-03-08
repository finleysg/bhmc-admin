/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import React from "react"

// Mock useAdminPaymentData
const mockUseAdminPaymentData = jest.fn()
jest.mock("../hooks/use-admin-payment-data", () => ({
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	useAdminPaymentData: (...args: unknown[]) => mockUseAdminPaymentData(...args),
}))

// Mock useStripeAmount
const mockUseStripeAmount = jest.fn()
jest.mock("../hooks/use-stripe-amount", () => ({
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	useStripeAmount: (...args: unknown[]) => mockUseStripeAmount(...args),
}))

// Mock useCustomerSession
jest.mock("../hooks/use-customer-session", () => ({
	useCustomerSession: () => ({ data: "cuss_test_secret" }),
}))

// Mock useAuth
const mockUseAuth = jest.fn()
jest.mock("../auth-context", () => ({
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	useAuth: () => mockUseAuth(),
}))

// Mock next/navigation
jest.mock("next/navigation", () => ({
	useParams: () => ({ registrationId: "1", paymentId: "2" }),
	usePathname: () => "/registration/1/payment/2",
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
	mockUseAdminPaymentData.mockReset()
	mockUseStripeAmount.mockReset()
	mockUseAuth.mockReset()
	mockUseAuth.mockReturnValue({
		user: { id: 10, email: "test@example.com", firstName: "Test", lastName: "User" },
		isAuthenticated: true,
		isLoading: false,
	})
})

test("renders loading state while data is pending", async () => {
	mockUseAdminPaymentData.mockReturnValue({
		data: undefined,
		isPending: true,
		error: null,
	})
	mockUseStripeAmount.mockReturnValue({
		data: undefined,
		isPending: true,
	})

	const { default: AdminPaymentLayout } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/layout"
	)

	render(
		<AdminPaymentLayout>
			<div>child content</div>
		</AdminPaymentLayout>,
	)

	expect(screen.getByText(/loading payment information/i)).toBeTruthy()
	expect(screen.queryByText("child content")).toBeNull()
})

test("renders error state when admin payment data fetch fails", async () => {
	mockUseAdminPaymentData.mockReturnValue({
		data: undefined,
		isPending: false,
		error: new Error("This payment has already been confirmed"),
	})
	mockUseStripeAmount.mockReturnValue({
		data: { amountDue: { subtotal: 25, transactionFee: 1.05, total: 26.05 }, amountCents: 2605 },
		isPending: false,
	})

	const { default: AdminPaymentLayout } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/layout"
	)

	render(
		<AdminPaymentLayout>
			<div>child content</div>
		</AdminPaymentLayout>,
	)

	expect(screen.getByText(/unable to process payment/i)).toBeTruthy()
	expect(screen.getByText(/this payment has already been confirmed/i)).toBeTruthy()
	expect(screen.queryByText("child content")).toBeNull()
})

test("renders Stripe Elements with correct amount when data loads", async () => {
	mockUseAdminPaymentData.mockReturnValue({
		data: {
			paymentId: 2,
			registrationId: 1,
			eventId: 100,
			eventName: "Summer Open",
			eventDate: "2025-06-15",
		},
		isPending: false,
		error: null,
	})
	mockUseStripeAmount.mockReturnValue({
		data: { amountDue: { subtotal: 25, transactionFee: 1.05, total: 26.05 }, amountCents: 2605 },
		isPending: false,
	})

	const { default: AdminPaymentLayout } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/layout"
	)

	render(
		<AdminPaymentLayout>
			<div>child content</div>
		</AdminPaymentLayout>,
	)

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

test("renders nothing while auth is loading", async () => {
	mockUseAuth.mockReturnValue({
		user: null,
		isAuthenticated: false,
		isLoading: true,
	})
	mockUseAdminPaymentData.mockReturnValue({
		data: undefined,
		isPending: true,
		error: null,
	})
	mockUseStripeAmount.mockReturnValue({
		data: undefined,
		isPending: true,
	})

	const { default: AdminPaymentLayout } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/layout"
	)

	const { container } = render(
		<AdminPaymentLayout>
			<div>child content</div>
		</AdminPaymentLayout>,
	)

	expect(container.innerHTML).toBe("")
})

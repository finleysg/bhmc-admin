/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react"
import React from "react"

// Mock next/navigation
let mockSearchParams = new URLSearchParams("payment_intent_client_secret=pi_secret_test")
jest.mock("next/navigation", () => ({
	useSearchParams: () => mockSearchParams,
}))

// Mock @stripe/stripe-js (loadStripe)
const mockRetrievePaymentIntent = jest.fn()
const mockStripeInstance = { retrievePaymentIntent: mockRetrievePaymentIntent }
jest.mock("@stripe/stripe-js", () => ({
	loadStripe: () => Promise.resolve(mockStripeInstance),
}))

beforeEach(() => {
	mockSearchParams = new URLSearchParams("payment_intent_client_secret=pi_secret_test")
	mockRetrievePaymentIntent.mockReset()
})

test("shows Payment Complete on succeeded status", async () => {
	mockRetrievePaymentIntent.mockResolvedValue({
		paymentIntent: { status: "succeeded", amount: 2605 },
	})

	const { default: CompletePage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/complete/page"
	)

	render(<CompletePage />)

	await waitFor(() => {
		expect(screen.getByText(/payment complete/i)).toBeTruthy()
	})

	expect(screen.getByText(/\$26\.05/)).toBeTruthy()
})

test("shows Payment Processing on processing status", async () => {
	mockRetrievePaymentIntent.mockResolvedValue({
		paymentIntent: { status: "processing", amount: 2605 },
	})

	const { default: CompletePage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/complete/page"
	)

	render(<CompletePage />)

	await waitFor(() => {
		expect(screen.getByText(/payment processing/i)).toBeTruthy()
	})

	expect(screen.getByText(/being processed by your bank/i)).toBeTruthy()
})

test("shows Payment Failed on requires_payment_method status", async () => {
	mockRetrievePaymentIntent.mockResolvedValue({
		paymentIntent: { status: "requires_payment_method", amount: 2605 },
	})

	const { default: CompletePage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/complete/page"
	)

	render(<CompletePage />)

	await waitFor(() => {
		expect(screen.getByText(/payment method was declined/i)).toBeTruthy()
	})

	const retryLink = screen.getByRole("link", { name: /try again/i })
	expect(retryLink).toBeTruthy()
})

test("shows error when client secret is missing", async () => {
	mockSearchParams = new URLSearchParams("")

	const { default: CompletePage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/complete/page"
	)

	render(<CompletePage />)

	await waitFor(() => {
		expect(screen.getByText(/missing payment intent client secret/i)).toBeTruthy()
	})
})

test("shows Home link", async () => {
	mockRetrievePaymentIntent.mockResolvedValue({
		paymentIntent: { status: "succeeded", amount: 2605 },
	})

	const { default: CompletePage } = await import(
		"@/app/registration/[registrationId]/payment/[paymentId]/complete/page"
	)

	render(<CompletePage />)

	await waitFor(() => {
		expect(screen.getByText(/payment complete/i)).toBeTruthy()
	})

	const homeLink = screen.getByRole("link", { name: /home/i })
	expect(homeLink).toBeTruthy()
	expect(homeLink.getAttribute("href")).toBe("/")
})

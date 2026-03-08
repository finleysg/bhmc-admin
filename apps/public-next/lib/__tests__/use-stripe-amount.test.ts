/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

import { useStripeAmount } from "../hooks/use-stripe-amount"

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	})
	return ({ children }: { children: React.ReactNode }) =>
		React.createElement(QueryClientProvider, { client: queryClient }, children)
}

test("fetches stripe amount for a given payment ID", async () => {
	const mockData = {
		amountDue: { subtotal: 25.0, transactionFee: 1.05, total: 26.05 },
		amountCents: 2605,
	}

	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: () => Promise.resolve(mockData),
	})

	const { result } = renderHook(() => useStripeAmount(42), {
		wrapper: makeWrapper(),
	})

	await waitFor(() => expect(result.current.isSuccess).toBe(true))

	expect(global.fetch).toHaveBeenCalledWith("/api/payments/42/stripe-amount")
	expect(result.current.data).toEqual(mockData)
})

test("does not fetch when paymentId is 0", () => {
	global.fetch = jest.fn()

	const { result } = renderHook(() => useStripeAmount(0), {
		wrapper: makeWrapper(),
	})

	// Hook should stay in pending/idle state, fetch never called
	expect(result.current.isPending).toBe(true)
	expect(global.fetch).not.toHaveBeenCalled()
})

test("returns error state on fetch failure", async () => {
	global.fetch = jest.fn().mockResolvedValue({
		ok: false,
		status: 500,
	})

	const { result } = renderHook(() => useStripeAmount(42), {
		wrapper: makeWrapper(),
	})

	await waitFor(() => expect(result.current.isError).toBe(true))
})

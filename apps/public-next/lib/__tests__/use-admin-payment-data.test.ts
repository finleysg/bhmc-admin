/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

import { useAdminPaymentData } from "../hooks/use-admin-payment-data"

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

test("returns data on successful fetch", async () => {
	const mockData = {
		paymentId: 2,
		registrationId: 1,
		eventId: 100,
		eventName: "Summer Open",
		eventDate: "2025-06-15",
	}

	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: () => Promise.resolve(mockData),
	})

	const { result } = renderHook(() => useAdminPaymentData(2, 1), {
		wrapper: makeWrapper(),
	})

	await waitFor(() => expect(result.current.isSuccess).toBe(true))

	expect(global.fetch).toHaveBeenCalledWith("/api/payments/2/admin-payment/1")
	expect(result.current.data).toEqual(mockData)
})

test("returns error when fetch fails", async () => {
	global.fetch = jest.fn().mockResolvedValue({
		ok: false,
		status: 403,
		json: () => Promise.resolve({ message: "This payment is not associated with your account" }),
	})

	const { result } = renderHook(() => useAdminPaymentData(2, 1), {
		wrapper: makeWrapper(),
	})

	await waitFor(() => expect(result.current.isError).toBe(true))
	expect(result.current.error?.message).toBe("This payment is not associated with your account")
})

test("disabled when paymentId is 0", () => {
	global.fetch = jest.fn()

	const { result } = renderHook(() => useAdminPaymentData(0, 1), {
		wrapper: makeWrapper(),
	})

	expect(result.current.isPending).toBe(true)
	expect(global.fetch).not.toHaveBeenCalled()
})

test("disabled when registrationId is 0", () => {
	global.fetch = jest.fn()

	const { result } = renderHook(() => useAdminPaymentData(2, 0), {
		wrapper: makeWrapper(),
	})

	expect(result.current.isPending).toBe(true)
	expect(global.fetch).not.toHaveBeenCalled()
})

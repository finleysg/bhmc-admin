/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { type PropsWithChildren } from "react"

import { useRegistrationSlots } from "../hooks/use-registration-slots"
import {
	getLastSSEVersion,
	recordSSEVersion,
	resetSSEVersion,
} from "../registration/sse-version-tracker"

const EVENT_ID = 42

describe("SSE version tracker", () => {
	beforeEach(() => {
		resetSSEVersion(EVENT_ID)
	})

	it("starts at 0 when nothing has been recorded", () => {
		expect(getLastSSEVersion(EVENT_ID)).toBe(0)
	})

	it("records strictly-greater versions and rejects out-of-order ones", () => {
		expect(recordSSEVersion(EVENT_ID, 1)).toBe(true)
		expect(getLastSSEVersion(EVENT_ID)).toBe(1)

		// equal — reject (treat replays as no-op)
		expect(recordSSEVersion(EVENT_ID, 1)).toBe(false)
		expect(getLastSSEVersion(EVENT_ID)).toBe(1)

		// older — reject
		expect(recordSSEVersion(EVENT_ID, 0)).toBe(false)
		expect(getLastSSEVersion(EVENT_ID)).toBe(1)

		expect(recordSSEVersion(EVENT_ID, 5)).toBe(true)
		expect(getLastSSEVersion(EVENT_ID)).toBe(5)
	})

	it("reset returns the tracker to 0", () => {
		recordSSEVersion(EVENT_ID, 7)
		resetSSEVersion(EVENT_ID)
		expect(getLastSSEVersion(EVENT_ID)).toBe(0)
	})
})

describe("useRegistrationSlots respects SSE version", () => {
	const FRESH_SSE_DATA = [{ id: 1, status: "P" }] as never
	const STALE_HTTP_DATA = [{ id: 1, status: "A" }] as never

	let originalFetch: typeof fetch

	beforeEach(() => {
		resetSSEVersion(EVENT_ID)
		originalFetch = global.fetch
	})

	afterEach(() => {
		global.fetch = originalFetch
	})

	function renderWithClient(client: QueryClient) {
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		)
		return renderHook(() => useRegistrationSlots(EVENT_ID), { wrapper })
	}

	it("does not overwrite SSE-populated cache when an in-flight HTTP fetch returns later", async () => {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
		})

		// Simulate the SSE handler having already written fresh data and
		// recorded a version.
		client.setQueryData(["event-registration-slots", EVENT_ID], FRESH_SSE_DATA)
		recordSSEVersion(EVENT_ID, 1)

		// The HTTP fetch (e.g. the initial useQuery fetch that started before
		// the SSE event arrived) eventually returns with stale data.
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(STALE_HTTP_DATA),
		}) as unknown as typeof fetch

		const { result } = renderWithClient(client)

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		// Cache should still hold the SSE data; queryFn returned the cached
		// snapshot rather than the stale HTTP payload.
		expect(result.current.data).toEqual(FRESH_SSE_DATA)
	})

	it("uses HTTP data when no SSE event has been received yet", async () => {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
		})

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(STALE_HTTP_DATA),
		}) as unknown as typeof fetch

		const { result } = renderWithClient(client)

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(STALE_HTTP_DATA)
	})

	it("uses HTTP data again after SSE disconnect resets the version", async () => {
		const client = new QueryClient({
			defaultOptions: {
				queries: { retry: false, refetchOnWindowFocus: false, staleTime: 0 },
			},
		})

		client.setQueryData(["event-registration-slots", EVENT_ID], FRESH_SSE_DATA)
		recordSSEVersion(EVENT_ID, 1)
		// SSE disconnects; tracker is cleared (mirrors registration-provider behavior).
		resetSSEVersion(EVENT_ID)

		const POLLED_DATA = [{ id: 1, status: "R" }] as never
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(POLLED_DATA),
		}) as unknown as typeof fetch

		const { result } = renderWithClient(client)
		// Force the polling refetch path (which is what kicks in on disconnect).
		await client.invalidateQueries({ queryKey: ["event-registration-slots", EVENT_ID] })

		await waitFor(() => expect(result.current.data).toEqual(POLLED_DATA))
	})
})

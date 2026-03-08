/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react"

import type { SSEUpdateEvent } from "../registration/types"
import { useRegistrationSSE } from "../hooks/use-registration-sse"

// --- Mock EventSource ---

type EventSourceListener = (event: Event | MessageEvent) => void

class MockEventSource {
	static instances: MockEventSource[] = []

	url: string
	readyState = 0
	onopen: (() => void) | null = null
	onerror: (() => void) | null = null
	close = jest.fn()

	private listeners: Record<string, EventSourceListener[]> = {}

	constructor(url: string) {
		this.url = url
		MockEventSource.instances.push(this)
	}

	addEventListener(type: string, listener: EventSourceListener) {
		if (!this.listeners[type]) this.listeners[type] = []
		this.listeners[type].push(listener)
	}

	removeEventListener(type: string, listener: EventSourceListener) {
		if (this.listeners[type]) {
			this.listeners[type] = this.listeners[type].filter((l) => l !== listener)
		}
	}

	simulateOpen() {
		this.readyState = 1
		this.onopen?.()
	}

	simulateEvent(type: string, data: unknown) {
		const event = new MessageEvent(type, { data: JSON.stringify(data) })
		this.listeners[type]?.forEach((l) => l(event))
	}

	simulateConnectionError() {
		this.onerror?.()
	}
}

// Replace global EventSource before the hook module resolves it
Object.defineProperty(global, "EventSource", {
	writable: true,
	value: MockEventSource,
})

beforeEach(() => {
	MockEventSource.instances = []
	jest.useFakeTimers()
})

afterEach(() => {
	jest.useRealTimers()
})

describe("useRegistrationSSE", () => {
	describe("Case 1 — Subscribe to SSE on landing", () => {
		it("constructs EventSource with the correct URL", () => {
			renderHook(() =>
				useRegistrationSSE({
					eventId: 42,
					enabled: true,
				}),
			)

			expect(MockEventSource.instances).toHaveLength(1)
			expect(MockEventSource.instances[0].url).toBe("/api/registration/42/live")
		})

		it("calls onUpdate when an update event is received", () => {
			const onUpdate = jest.fn()
			renderHook(() =>
				useRegistrationSSE({
					eventId: 42,
					enabled: true,
					onUpdate,
				}),
			)

			const es = MockEventSource.instances[0]
			const sseData: SSEUpdateEvent = {
				eventId: 42,
				timestamp: "2026-02-18T00:00:00Z",
				slots: [],
				currentWave: 1,
			}
			es.simulateEvent("update", sseData)

			expect(onUpdate).toHaveBeenCalledWith(sseData)
		})

		it("calls onError when an error event with data is received", () => {
			const onError = jest.fn()
			renderHook(() =>
				useRegistrationSSE({
					eventId: 42,
					enabled: true,
					onError,
				}),
			)

			const es = MockEventSource.instances[0]
			const errorData = { message: "Registration closed" }
			es.simulateEvent("error", errorData)

			expect(onError).toHaveBeenCalledWith(errorData)
		})

		it("does not connect when enabled is false", () => {
			renderHook(() =>
				useRegistrationSSE({
					eventId: 42,
					enabled: false,
				}),
			)

			expect(MockEventSource.instances).toHaveLength(0)
		})

		it("does not connect when eventId is undefined", () => {
			renderHook(() =>
				useRegistrationSSE({
					eventId: undefined,
					enabled: true,
				}),
			)

			expect(MockEventSource.instances).toHaveLength(0)
		})
	})

	describe("Case 2 — Unsubscribe on navigate away", () => {
		it("calls close() on unmount", () => {
			const { unmount } = renderHook(() =>
				useRegistrationSSE({
					eventId: 42,
					enabled: true,
				}),
			)

			const es = MockEventSource.instances[0]
			unmount()

			expect(es.close).toHaveBeenCalled()
		})

		it("clears pending retry timeout on unmount", () => {
			const { unmount } = renderHook(() =>
				useRegistrationSSE({
					eventId: 42,
					enabled: true,
				}),
			)

			const es = MockEventSource.instances[0]
			// Trigger onerror to start a retry timeout
			es.simulateConnectionError()

			// Unmount before the retry fires
			unmount()

			// Advance timers — if the timeout wasn't cleared, a new EventSource would be created
			const countBefore = MockEventSource.instances.length
			act(() => {
				jest.advanceTimersByTime(5000)
			})
			expect(MockEventSource.instances.length).toBe(countBefore)
		})

		it("calls close() when enabled changes from true to false", () => {
			const { rerender } = renderHook(
				({ enabled }: { enabled: boolean }) =>
					useRegistrationSSE({
						eventId: 42,
						enabled,
					}),
				{ initialProps: { enabled: true } },
			)

			const es = MockEventSource.instances[0]
			rerender({ enabled: false })

			expect(es.close).toHaveBeenCalled()
		})

		it("retries with exponential backoff and stops after MAX_RETRIES", () => {
			renderHook(() =>
				useRegistrationSSE({
					eventId: 42,
					enabled: true,
				}),
			)

			// Expected delays: 1s, 2s, 4s, 8s, 16s (5 retries total)
			const expectedDelays = [1000, 2000, 4000, 8000, 16000]

			for (let i = 0; i < expectedDelays.length; i++) {
				const currentEs = MockEventSource.instances[MockEventSource.instances.length - 1]
				currentEs.simulateConnectionError()

				const countBefore = MockEventSource.instances.length
				act(() => {
					jest.advanceTimersByTime(expectedDelays[i] - 1)
				})
				// Should not have reconnected yet
				expect(MockEventSource.instances.length).toBe(countBefore)

				act(() => {
					jest.advanceTimersByTime(1)
				})
				// Should have reconnected
				expect(MockEventSource.instances.length).toBe(countBefore + 1)
			}

			// After 5 retries, another error should NOT create a new connection
			const lastEs = MockEventSource.instances[MockEventSource.instances.length - 1]
			lastEs.simulateConnectionError()

			const countAfterMax = MockEventSource.instances.length
			act(() => {
				jest.advanceTimersByTime(60000)
			})
			expect(MockEventSource.instances.length).toBe(countAfterMax)
		})
	})
})

import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { usePaymentTimeout } from "../../hooks/use-payment-timeout"

describe("usePaymentTimeout", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	it("should call onTimeout after specified duration when processing", () => {
		const onTimeout = vi.fn()
		const timeoutDuration = 5000

		renderHook(() =>
			usePaymentTimeout({
				isProcessing: true,
				onTimeout,
				timeoutDuration,
			}),
		)

		// Fast-forward time
		act(() => {
			vi.advanceTimersByTime(timeoutDuration)
		})

		expect(onTimeout).toHaveBeenCalledTimes(1)
	})

	it("should not call onTimeout when not processing", () => {
		const onTimeout = vi.fn()

		renderHook(() =>
			usePaymentTimeout({
				isProcessing: false,
				onTimeout,
				timeoutDuration: 1000,
			}),
		)

		act(() => {
			vi.advanceTimersByTime(2000)
		})

		expect(onTimeout).not.toHaveBeenCalled()
	})

	it("should clear timeout when processing changes to false", () => {
		const onTimeout = vi.fn()
		let isProcessing = true

		const { rerender } = renderHook(() =>
			usePaymentTimeout({
				isProcessing,
				onTimeout,
				timeoutDuration: 5000,
			}),
		)

		// Change processing state before timeout
		isProcessing = false
		rerender()

		act(() => {
			vi.advanceTimersByTime(6000)
		})

		expect(onTimeout).not.toHaveBeenCalled()
	})

	it("should use default timeout duration", () => {
		const onTimeout = vi.fn()

		renderHook(() =>
			usePaymentTimeout({
				isProcessing: true,
				onTimeout,
				// No timeoutDuration provided - should use default of 120000ms (2 minutes)
			}),
		)

		// Advance by less than default timeout
		act(() => {
			vi.advanceTimersByTime(119000)
		})
		expect(onTimeout).not.toHaveBeenCalled()

		// Advance to trigger default timeout
		act(() => {
			vi.advanceTimersByTime(1001)
		})
		expect(onTimeout).toHaveBeenCalledTimes(1)
	})
})

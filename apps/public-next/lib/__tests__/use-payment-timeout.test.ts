/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react"

import { usePaymentTimeout } from "../hooks/use-payment-timeout"

beforeEach(() => {
	jest.useFakeTimers()
})

afterEach(() => {
	jest.useRealTimers()
})

test("fires onTimeout after specified duration when processing", () => {
	const onTimeout = jest.fn()

	renderHook(() =>
		usePaymentTimeout({
			isProcessing: true,
			onTimeout,
			timeoutDuration: 5000,
		}),
	)

	act(() => {
		jest.advanceTimersByTime(5000)
	})

	expect(onTimeout).toHaveBeenCalledTimes(1)
})

test("does not fire onTimeout when not processing", () => {
	const onTimeout = jest.fn()

	renderHook(() =>
		usePaymentTimeout({
			isProcessing: false,
			onTimeout,
			timeoutDuration: 5000,
		}),
	)

	act(() => {
		jest.advanceTimersByTime(10000)
	})

	expect(onTimeout).not.toHaveBeenCalled()
})

test("clears timeout when processing stops", () => {
	const onTimeout = jest.fn()

	const { rerender } = renderHook(
		({ isProcessing }) =>
			usePaymentTimeout({
				isProcessing,
				onTimeout,
				timeoutDuration: 5000,
			}),
		{ initialProps: { isProcessing: true } },
	)

	// Advance part way through the timeout
	act(() => {
		jest.advanceTimersByTime(2500)
	})

	// Stop processing - this should clear the timeout
	rerender({ isProcessing: false })

	// Advance past when the timeout would have fired
	act(() => {
		jest.advanceTimersByTime(5000)
	})

	// onTimeout should never have been called since we stopped processing
	expect(onTimeout).not.toHaveBeenCalled()
})

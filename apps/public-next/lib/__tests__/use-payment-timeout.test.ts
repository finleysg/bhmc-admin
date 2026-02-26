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

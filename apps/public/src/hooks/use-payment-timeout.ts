import { useCallback, useEffect, useRef } from "react"

interface UsePaymentTimeoutProps {
	isProcessing: boolean
	onTimeout: () => void
	timeoutDuration?: number // in milliseconds
}

/**
 * Hook to handle payment timeouts and provide automatic cleanup
 * for stuck payment processes.
 */
export function usePaymentTimeout({
	isProcessing,
	onTimeout,
	timeoutDuration = 120000, // 2 minutes default
}: UsePaymentTimeoutProps) {
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const clearTimeoutRef = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}
	}, [])

	useEffect(() => {
		if (isProcessing) {
			// Set up timeout for stuck payments
			timeoutRef.current = setTimeout(() => {
				console.warn("Payment timeout triggered after", timeoutDuration / 1000, "seconds")
				onTimeout()
			}, timeoutDuration)
		} else {
			clearTimeoutRef()
		}

		// Cleanup on unmount
		return clearTimeoutRef
	}, [isProcessing, onTimeout, timeoutDuration, clearTimeoutRef])

	return {
		clearTimeout: clearTimeoutRef,
	}
}

import { useCallback, useEffect, useRef } from "react"

interface UsePaymentTimeoutProps {
	isProcessing: boolean
	onTimeout: () => void
	timeoutDuration?: number
}

export function usePaymentTimeout({
	isProcessing,
	onTimeout,
	timeoutDuration = 120000,
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
			timeoutRef.current = setTimeout(() => {
				onTimeout()
			}, timeoutDuration)
		} else {
			clearTimeoutRef()
		}

		return clearTimeoutRef
	}, [isProcessing, onTimeout, timeoutDuration, clearTimeoutRef])

	return { clearTimeout: clearTimeoutRef }
}

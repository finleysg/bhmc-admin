import { useCallback, useEffect, useRef } from "react"

import {
	SSEErrorEvent,
	SSEErrorEventSchema,
	SSEUpdateEvent,
	SSEUpdateEventSchema,
} from "../types/sse"
import { serverUrl } from "../utils/api-utils"

interface UseRegistrationSSEOptions {
	eventId: number | undefined
	enabled: boolean
	onUpdate?: (data: SSEUpdateEvent) => void
	onError?: (error: SSEErrorEvent) => void
}

const INITIAL_RETRY_DELAY = 1000
const MAX_RETRY_DELAY = 30000
const MAX_RETRIES = 5
const BACKOFF_MULTIPLIER = 2

export function useRegistrationSSE({
	eventId,
	enabled,
	onUpdate,
	onError,
}: UseRegistrationSSEOptions): void {
	const eventSourceRef = useRef<EventSource | null>(null)
	const retryCountRef = useRef(0)
	const retryTimeoutRef = useRef<number | null>(null)

	const cleanup = useCallback(() => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close()
			eventSourceRef.current = null
		}
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current)
			retryTimeoutRef.current = null
		}
	}, [])

	const connect = useCallback(() => {
		if (!eventId || !enabled) return

		cleanup()

		const url = serverUrl(`registration/${eventId}/live`)
		const es = new EventSource(url, { withCredentials: true })
		eventSourceRef.current = es

		es.onopen = () => {
			retryCountRef.current = 0
		}

		es.addEventListener("update", (event) => {
			try {
				const data = SSEUpdateEventSchema.parse(JSON.parse(event.data))
				onUpdate?.(data)
			} catch (err) {
				console.error("Failed to parse SSE update:", err)
			}
		})

		es.addEventListener("error", (event) => {
			try {
				const data = SSEErrorEventSchema.parse(JSON.parse((event as MessageEvent).data))
				onError?.(data)
			} catch {
				// Generic error, not a parsed error event
			}
		})

		es.onerror = () => {
			cleanup()

			// Attempt reconnection with exponential backoff
			if (retryCountRef.current < MAX_RETRIES && enabled) {
				const delay = Math.min(
					INITIAL_RETRY_DELAY * Math.pow(BACKOFF_MULTIPLIER, retryCountRef.current),
					MAX_RETRY_DELAY,
				)
				retryCountRef.current++
				retryTimeoutRef.current = window.setTimeout(connect, delay)
			}
		}
	}, [eventId, enabled, cleanup, onUpdate, onError])

	useEffect(() => {
		if (enabled && eventId) {
			connect()
		} else {
			cleanup()
		}

		return cleanup
	}, [enabled, eventId, connect, cleanup])
}

"use client"

import { useCallback, useEffect, useRef } from "react"

import type { SSEUpdateEvent } from "../registration/types"

interface UseRegistrationSSEOptions {
	eventId: number | undefined
	enabled: boolean
	onUpdate?: (data: SSEUpdateEvent) => void
	onError?: (error: unknown) => void
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
	const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

		const url = `/api/registration/${eventId}/live`
		const es = new EventSource(url)
		eventSourceRef.current = es

		es.onopen = () => {
			retryCountRef.current = 0
		}

		es.addEventListener("update", (event: Event) => {
			try {
				const messageEvent = event as MessageEvent<string>
				const data = JSON.parse(messageEvent.data) as SSEUpdateEvent
				onUpdate?.(data)
			} catch (err) {
				console.error("Failed to parse SSE update:", err)
			}
		})

		es.addEventListener("error", (event: Event) => {
			try {
				const messageEvent = event as MessageEvent<string>
				const data = JSON.parse(messageEvent.data) as unknown
				onError?.(data)
			} catch {
				// Generic error, not a parsed error event
			}
		})

		es.onerror = () => {
			cleanup()

			if (retryCountRef.current < MAX_RETRIES && enabled) {
				const delay = Math.min(
					INITIAL_RETRY_DELAY * Math.pow(BACKOFF_MULTIPLIER, retryCountRef.current),
					MAX_RETRY_DELAY,
				)
				retryCountRef.current++
				retryTimeoutRef.current = setTimeout(connect, delay)
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

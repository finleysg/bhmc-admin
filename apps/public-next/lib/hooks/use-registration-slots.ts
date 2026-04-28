import { useQuery, useQueryClient } from "@tanstack/react-query"

import { getLastSSEVersion } from "../registration/sse-version-tracker"
import type { RegistrationSlot } from "../types"

interface UseRegistrationSlotsOptions {
	refetchInterval?: number | false
}

export function useRegistrationSlots(
	eventId: number | undefined,
	options?: UseRegistrationSlotsOptions,
) {
	const queryClient = useQueryClient()
	return useQuery({
		queryKey: ["event-registration-slots", eventId],
		queryFn: async () => {
			const response = await fetch(`/api/registration-slots?event_id=${eventId}`)
			if (!response.ok) throw new Error("Failed to fetch registration slots")
			const fetched = (await response.json()) as RegistrationSlot[]

			// If the SSE stream has already delivered a snapshot for this event,
			// it is authoritative and fresher than this HTTP fetch (which may have
			// been in flight since before the SSE event). Keep whatever the SSE
			// handler wrote to the cache instead of clobbering with stale data.
			// Assumes consumers mount under RegistrationProvider, which owns the
			// resetSSEVersion call on disconnect; outside that provider the cache
			// will stay locked once any SSE event has been recorded.
			if (eventId !== undefined && getLastSSEVersion(eventId) > 0) {
				const cached = queryClient.getQueryData<RegistrationSlot[]>([
					"event-registration-slots",
					eventId,
				])
				if (cached) return cached
			}
			return fetched
		},
		enabled: !!eventId,
		refetchInterval: options?.refetchInterval,
	})
}

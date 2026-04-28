// Tracks the highest SSE event version applied per eventId so that
// in-flight HTTP fetches from useRegistrationSlots don't clobber fresher
// SSE-delivered slot snapshots when they return out of order.
//
// The server bumps `version` on every successful build of a
// RegistrationUpdateEvent. The client treats SSE as authoritative once any
// SSE event has arrived: HTTP fetches that complete after that point are
// dropped in favor of the cached data the SSE handler has already written.
//
// Reset on SSE disconnect so that the polling fallback in
// reserve-page-content.tsx can repopulate the cache while disconnected.

const lastVersionByEvent = new Map<number, number>()

export function getLastSSEVersion(eventId: number): number {
	return lastVersionByEvent.get(eventId) ?? 0
}

export function recordSSEVersion(eventId: number, version: number): boolean {
	const current = lastVersionByEvent.get(eventId) ?? 0
	if (version <= current) return false
	lastVersionByEvent.set(eventId, version)
	return true
}

export function resetSSEVersion(eventId: number): void {
	lastVersionByEvent.delete(eventId)
}

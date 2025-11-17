import { EventDomainData, RegistrationSlotDomainData } from "./types"

/**
 * Determine group string for a registration slot.
 *
 * - For eventType "N" + "TT": CourseName-Start Time
 * - For eventType "N" + "SG": CourseName-Starting Hole (e.g., "8B")
 * - For eventType "W" or "O": registrationId (or registrationId + a/b when teamSize==2 and 4 players)
 *
 * This function expects the caller to provide the startValue (result of getStart) and
 * the courseName (lookup from courseId).
 */
export function getGroup(
	event: EventDomainData,
	slot: RegistrationSlotDomainData,
	startValue: string,
	courseName: string,
	allSlotsInRegistration: RegistrationSlotDomainData[] = [],
): string {
	if (event.eventType === "N") {
		if (event.startType === "TT" || event.startType === "SG") {
			return `${courseName}-${startValue}`
		}
		return `${courseName}-${startValue}`
	}

	if (event.eventType === "W" || event.eventType === "O") {
		const regId = slot.registrationId
		if (regId === null || regId === undefined) {
			throw new Error("Missing registrationId on slot for group calculation")
		}

		if (event.teamSize === 2 && allSlotsInRegistration.length === 4) {
			const sorted = [...allSlotsInRegistration].sort((a, b) => a.slot - b.slot)
			const idx = sorted.findIndex((s) => s.id === slot.id)
			if (idx === -1) throw new Error("Current slot not found in allSlotsInRegistration")
			const suffix = idx < 2 ? "a" : "b"
			return `${regId}${suffix}`
		}

		return String(regId)
	}

	// Default fallback
	return String(slot.registrationId ?? "unknown")
}

import { calculateStartingHole } from "./start-hole.domain"
import { calculateTeeTime } from "./start-time.domain"
import { EventDomainData, HoleDomainData, RegistrationSlotDomainData, StartResult } from "./types"

/**
 * Public domain function that calculates the "start" value for a registration slot.
 *
 * Behavior:
 * - If event.eventType !== "N" return "N/A"
 * - If eventType === "N" and startType === "TT" -> return tee time (H:MM AM|PM)
 * - If eventType === "N" and startType === "SG" -> return starting hole (e.g. "8B")
 *
 * This function is pure and deterministic: all required data must be provided by the caller.
 */
export function getStart(
	event: EventDomainData,
	slot: RegistrationSlotDomainData,
	holes: HoleDomainData[],
): StartResult {
	// Use the canChoose flag to determine whether course-based starts apply.
	// If canChoose is falsy (0/false/undefined) there is no course data and we return "N/A".
	if (!event.canChoose) {
		return "N/A"
	}

	const startType = event.startType ?? null

	if (startType === "TT") {
		// For tee times, we expect startTime and teeTimeSplits to be present;
		// calculateTeeTime will throw a helpful error if not.
		return calculateTeeTime(event, slot)
	}

	if (startType === "SG") {
		// For shotgun, slot.holeId must be provided and holes must include it.
		return calculateStartingHole(slot, holes)
	}

	return "N/A"
}

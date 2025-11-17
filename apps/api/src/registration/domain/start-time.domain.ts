import { formatTime, parseTeeTimeSplits, parseTime } from "./time-utils"
import { EventDomainData, RegistrationSlotDomainData } from "./types"

/**
 * Calculate a tee time for a registration slot.
 *
 * Rules:
 * - slot is 0-based.
 * - teeTimeSplits is either "9" or "8,9" etc. Values repeat.
 * - starterTimeInterval N means every N filled tee times there is one open tee time (gap).
 *   Example: N=4 -> after 4 filled tee times insert one gap, then continue.
 *
 * Algorithm:
 * - Compute the tee index (including gaps) for the given filled slot:
 *     teeIndex = slot + floor(slot / starterTimeInterval)   (if starterTimeInterval > 0)
 *   If starterTimeInterval <= 0 then teeIndex = slot.
 * - Sum the first `teeIndex` split intervals to get minutes offset from event.startTime.
 *   (No offset for slot 0.)
 */
export function calculateTeeTime(event: EventDomainData, slot: RegistrationSlotDomainData): string {
	if (!event.startTime) throw new Error("Missing event.startTime for tee time calculation")
	const splits = parseTeeTimeSplits(event.teeTimeSplits)
	const baseMinutes = parseTime(event.startTime)

	const starterInterval = Number(event.starterTimeInterval) || 0

	// Determine how many intervals to advance from base.
	// For slot 0 we return base time.
	const s = slot.startingOrder
	if (s < 0) throw new Error("Slot must be non-negative")

	let teeIndex = s
	if (starterInterval > 0) {
		teeIndex = s + Math.floor(s / starterInterval)
	}

	// Sum the first `teeIndex` intervals (i.e., intervals between tee times)
	let offset = 0
	for (let i = 0; i < teeIndex; i++) {
		const split = splits[i % splits.length]
		offset += split
	}

	const resultMinutes = baseMinutes + offset
	return formatTime(resultMinutes)
}

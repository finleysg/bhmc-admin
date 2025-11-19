import { ClubEvent, Hole, RegistrationSlot } from "../types"
import { formatTime, parseTeeTimeSplits, parseTime } from "./time-utils"

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
export function calculateTeeTime(event: ClubEvent, slot: RegistrationSlot): string {
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

/**
 * Calculate a shotgun starting hole string (e.g. "8B").
 *
 * Rules:
 * - `startingOrder` is 0 or 1 mapping to "A" or "B".
 * - `slot.holeId` must be provided and matched against the provided holes array.
 * - Returns `${holeNumber}${letter}`.
 */
export function calculateStartingHole(slot: RegistrationSlot, holes: Hole[]): string {
	if (slot.holeId === null || slot.holeId === undefined) {
		throw new Error("Missing holeId on slot for shotgun start")
	}

	const hole = holes.find((h) => h.id === slot.holeId)
	if (!hole) {
		throw new Error(`Hole with id ${slot.holeId} not found in provided holes`)
	}

	const holeNumber = hole.holeNumber
	const order = slot.startingOrder
	if (order !== 0 && order !== 1) {
		throw new Error(`Invalid startingOrder: ${order}`)
	}
	const letter = order === 0 ? "A" : "B"
	return `${holeNumber}${letter}`
}

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
	event: ClubEvent,
	slot: RegistrationSlot,
	startValue: string,
	courseName: string,
	allSlotsInRegistration: RegistrationSlot[] = [],
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
export function getStart(event: ClubEvent, slot: RegistrationSlot, holes: Hole[]): string {
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

/**
 * Time utilities for parsing and formatting times used by domain logic.
 * Deterministic, no side effects.
 */

/**
 * Parse a date-only string (YYYY-MM-DD) as local midnight.
 * Avoids timezone shift that occurs with new Date("YYYY-MM-DD").
 */
export function parseLocalDate(dateString: string): Date {
	return new Date(dateString + "T00:00:00")
}

/**
 * Parse a time string like "5:00 PM" or "12:30 AM" into minutes since midnight.
 * Throws on invalid input.
 */
export function parseTime(timeStr: string): number {
	const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/)
	if (!m) throw new Error(`Invalid time format: ${timeStr}`)
	let hour = Number(m[1])
	const minute = Number(m[2])
	const ampm = m[3].toUpperCase()

	if (hour < 1 || hour > 12) throw new Error(`Hour out of range in time: ${timeStr}`)
	if (minute < 0 || minute > 59) throw new Error(`Minute out of range in time: ${timeStr}`)

	if (ampm === "AM") {
		if (hour === 12) hour = 0
	} else {
		if (hour !== 12) hour += 12
	}

	return hour * 60 + minute
}

/**
 * Format minutes since midnight back to "H:MM AM|PM" (no leading zero on hour).
 * Handles minutes >= 0. Values >= 24*60 will wrap past midnight.
 */
export function formatTime(totalMinutes: number): string {
	// Normalize to a 0..1439 range
	const minutes = ((Math.floor(totalMinutes) % (24 * 60)) + 24 * 60) % (24 * 60)
	const hour24 = Math.floor(minutes / 60)
	const minute = minutes % 60
	const ampm = hour24 >= 12 ? "PM" : "AM"
	let hour12 = hour24 % 12
	if (hour12 === 0) hour12 = 12
	const minuteStr = minute.toString().padStart(2, "0")
	return `${hour12}:${minuteStr} ${ampm}`
}

/**
 * Parse tee time splits string like "9" or "8,9" into number array [9] or [8,9].
 * Throws on invalid input.
 */
export function parseTeeTimeSplits(splits?: string | null): number[] {
	if (!splits) throw new Error("Missing tee time splits")
	const parts = splits
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean)
	if (parts.length === 0) throw new Error("Invalid tee time splits")
	const nums = parts.map((p) => {
		const n = Number(p)
		if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid tee time split value: ${p}`)
		return Math.floor(n)
	})
	return nums
}

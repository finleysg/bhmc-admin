/**
 * Convert a raw MySQL datetime string (e.g. "2026-03-08 16:00:00.000000")
 * to ISO 8601 with explicit UTC indicator ("2026-03-08T16:00:00.000Z").
 *
 * Drizzle with `mode: "string"` returns bare datetime strings with no
 * timezone indicator. Without the "Z" suffix, `new Date()` interprets
 * these as local time instead of UTC.
 *
 * Idempotent: strings already carrying "Z" or a timezone offset are
 * returned unchanged.
 */
export function fromMysqlDatetime(mysql: string): string {
	const trimmed = mysql.trim()
	if (trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
		return trimmed
	}
	// "2026-03-08 16:00:00.000000" → "2026-03-08T16:00:00.000Z"
	// Also handle ISO-like strings without timezone (e.g. "2026-03-08T16:00:00")
	const hasT = trimmed.includes("T")
	const [datePart, timePart] = trimmed.split(hasT ? "T" : " ")
	if (!datePart || !timePart) {
		throw new Error(`Invalid MySQL datetime value: ${mysql}`)
	}
	// Trim microsecond precision (6 digits) to milliseconds (3 digits)
	const dotIndex = timePart.indexOf(".")
	const ms =
		dotIndex >= 0 ? "." + timePart.slice(dotIndex + 1, dotIndex + 4).padEnd(3, "0") : ".000"
	const timeWithoutFraction = dotIndex >= 0 ? timePart.slice(0, dotIndex) : timePart
	return `${datePart}T${timeWithoutFraction}${ms}Z`
}

/**
 * Convert an ISO 8601 datetime string (e.g. "2026-03-08T16:00:00.000Z")
 * to the MySQL datetime format ("2026-03-08 16:00:00.000000").
 *
 * MySQL's datetime column does not accept the "T" separator or "Z" suffix.
 * Drizzle with `mode: "string"` passes values through without conversion,
 * so we must format them before writing.
 */
/**
 * Convert a raw MySQL datetime string (UTC) to a local date+time string
 * in the given timezone, formatted as "YYYY-MM-DD h:mm AM/PM".
 */
export function toLocalDatetime(mysql: string, tz = "America/Chicago"): string {
	const iso = fromMysqlDatetime(mysql)
	const dt = new Date(iso)
	const datePart = dt.toLocaleDateString("en-CA", { timeZone: tz })
	const timePart = dt.toLocaleTimeString("en-US", {
		timeZone: tz,
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	})
	return `${datePart} ${timePart}`
}

export function toMysqlDatetime(iso: string): string {
	const date = new Date(iso)
	if (isNaN(date.getTime())) {
		throw new Error(`Invalid datetime value: ${iso}`)
	}

	const yyyy = date.getUTCFullYear()
	const MM = String(date.getUTCMonth() + 1).padStart(2, "0")
	const dd = String(date.getUTCDate()).padStart(2, "0")
	const hh = String(date.getUTCHours()).padStart(2, "0")
	const mm = String(date.getUTCMinutes()).padStart(2, "0")
	const ss = String(date.getUTCSeconds()).padStart(2, "0")
	const us = String(date.getUTCMilliseconds()).padStart(3, "0") + "000"

	return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}.${us}`
}

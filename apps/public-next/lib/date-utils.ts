import { format, isDate, isValid, parseISO } from "date-fns"

/**
 * Parse a date-only string (yyyy-MM-dd) from the API without UTC timezone shift.
 * `new Date("2024-06-15")` parses as midnight UTC, which rolls back a day in US timezones.
 * `parseISO` from date-fns handles this correctly by treating date-only strings as local.
 */
export function parseApiDate(dateStr: string): Date {
	return parseISO(dateStr)
}

export function dayAndDateFormat(dt: number | Date) {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "iiii, MMM do")
	}
	return "--"
}

export function isoDayFormat(dt: number | Date) {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "yyyy-MM-dd")
	}
	return "--"
}

export function monthNameFormat(dt: number | Date) {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "MMMM")
	}
	return "--"
}

const centralTimeFormatter = new Intl.DateTimeFormat("en-US", {
	timeZone: "America/Chicago",
	weekday: "long",
	month: "short",
	day: "numeric",
	hour: "numeric",
	minute: "2-digit",
})

export function dayDateAndTimeFormat(dt: Date | string | null | undefined) {
	if (!dt) return ""
	const date = typeof dt === "string" ? parseISO(dt) : dt
	if (isDate(date) && isValid(date)) {
		return centralTimeFormatter.format(date)
	}
	return ""
}

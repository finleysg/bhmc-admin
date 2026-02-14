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

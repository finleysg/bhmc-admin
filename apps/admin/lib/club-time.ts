/**
 * Conversions between UTC instants from the API and the club-local values a
 * `datetime-local` input shows ("2027-04-28T09:00"), independent of the time
 * zone the code runs in.
 */
const CLUB_TIME_ZONE = "America/Chicago"

const formatter = new Intl.DateTimeFormat("en-US", {
	timeZone: CLUB_TIME_ZONE,
	hourCycle: "h23",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
})

function wallClockMs(utcMs: number): number {
	const parts = formatter.formatToParts(new Date(utcMs))
	const part = (type: string) => Number(parts.find((p) => p.type === type)!.value)
	return Date.UTC(
		part("year"),
		part("month") - 1,
		part("day"),
		part("hour"),
		part("minute"),
		part("second"),
	)
}

/** "2027-04-28T14:00:00.000Z" → "2027-04-28T09:00" (club time). Null stays empty. */
export function toClubLocalInput(iso: string | null | undefined): string {
	if (!iso) return ""
	return new Date(wallClockMs(Date.parse(iso))).toISOString().slice(0, 16)
}

/** "2027-04-28T09:00" (club time) → "2027-04-28T14:00:00.000Z". Empty becomes null. */
export function fromClubLocalInput(local: string): string | null {
	if (!local) return null
	const wall = Date.parse(`${local}:00Z`)
	if (Number.isNaN(wall)) return null
	let utc = wall - (wallClockMs(wall) - wall)
	utc = wall - (wallClockMs(utc) - utc)
	return new Date(utc).toISOString()
}

const displayFormatter = new Intl.DateTimeFormat("en-US", {
	timeZone: CLUB_TIME_ZONE,
	month: "short",
	day: "numeric",
	year: "numeric",
	hour: "numeric",
	minute: "2-digit",
})

/** A UTC database datetime ("2027-04-28 14:00:00.000000") as club time, e.g. "Apr 28, 2027, 9:00 AM". */
export function formatClubDateTime(value: string | null | undefined): string | null {
	if (!value) return null
	const ms = Date.parse(`${value.slice(0, 19).replace(" ", "T")}Z`)
	return Number.isNaN(ms) ? value : displayFormatter.format(ms)
}

const DAY_MS = 86_400_000

/** Whole days from one ISO date ("2027-05-05") to another; null if either is missing. */
export function daysBetween(from: string, to: string): number | null {
	const a = Date.parse(`${from}T00:00:00Z`)
	const b = Date.parse(`${to}T00:00:00Z`)
	return Number.isNaN(a) || Number.isNaN(b) ? null : Math.round((b - a) / DAY_MS)
}

/**
 * Moves a `datetime-local` value ("2027-04-28T09:00", club time) by whole days,
 * keeping its wall-clock time. Empty stays empty.
 */
export function shiftLocalInput(local: string, days: number): string {
	if (!local) return local
	const wall = Date.parse(`${local}:00Z`)
	if (Number.isNaN(wall)) return local
	return new Date(wall + days * DAY_MS).toISOString().slice(0, 16)
}

/**
 * Moves a UTC datetime from the API by whole days, keeping its wall-clock time
 * in club time (so 9:00 AM stays 9:00 AM across a daylight saving change).
 */
export function shiftByClubDays(iso: string | null | undefined, days: number): string | null {
	if (!iso) return null
	return fromClubLocalInput(shiftLocalInput(toClubLocalInput(iso), days))
}

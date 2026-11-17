/** Date and name rules for rolling an event forward into another season. */

const DAY_MS = 86_400_000
const CLUB_TIME_ZONE = "America/Chicago"

const clubParts = new Intl.DateTimeFormat("en-US", {
	timeZone: CLUB_TIME_ZONE,
	hourCycle: "h23",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
})

/** The source date moved forward a whole number of weeks per season: same weekday, about the same week. */
export function proposedDate(sourceDate: string, fromSeason: number, toSeason: number): string {
	const ms = Date.parse(`${sourceDate}T00:00:00Z`) + (toSeason - fromSeason) * 364 * DAY_MS
	return new Date(ms).toISOString().slice(0, 10)
}

/** The source name with the source year replaced by the target year ("2026 Season Registration"). */
export function proposedName(sourceName: string, fromSeason: number, toSeason: number): string {
	return sourceName.replace(new RegExp(`\\b${fromSeason}\\b`, "g"), String(toSeason))
}

/** Whole days from one date ("2026-05-06") to another. */
export function daysBetween(from: string, to: string): number {
	return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

/**
 * Moves an instant (ISO string) by whole days while keeping its wall-clock time in
 * club time, so a 9:00 PM signup copied across a daylight saving change still opens
 * at 9:00 PM. Null stays null.
 */
export function shiftByClubDays(iso: string | null, days: number): string | null {
	if (!iso) return null
	const utc = Date.parse(iso)
	const wallClock = utc + offsetAt(utc) + days * DAY_MS
	let shifted = wallClock - offsetAt(wallClock)
	shifted = wallClock - offsetAt(shifted)
	return new Date(shifted).toISOString()
}

/** The club time zone's offset from UTC, in ms, at the given instant. */
function offsetAt(utcMs: number): number {
	const parts = clubParts.formatToParts(new Date(utcMs))
	const part = (type: string) => Number(parts.find((p) => p.type === type)!.value)
	const asUtc = Date.UTC(
		part("year"),
		part("month") - 1,
		part("day"),
		part("hour"),
		part("minute"),
		part("second"),
	)
	return asUtc - Math.floor(utcMs / 1000) * 1000
}

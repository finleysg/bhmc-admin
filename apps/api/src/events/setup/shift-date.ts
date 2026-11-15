import { fromMysqlDatetime, toMysqlDatetime } from "../../common"

const DAY_MS = 86_400_000
const CLUB_TIME_ZONE = "America/Chicago"

/** Whole days from one ISO date ("2027-05-05") to another. */
export function daysBetween(from: string, to: string): number {
	return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

/**
 * Moves a stored (UTC) datetime by whole days while keeping its wall-clock
 * time in the club's time zone, so a 9:00 AM signup copied across a daylight
 * saving change still opens at 9:00 AM.
 */
export function shiftDatetimeByDays(mysqlUtc: string, days: number): string {
	const utc = Date.parse(fromMysqlDatetime(mysqlUtc))
	const wallClock = utc + offsetAt(utc) + days * DAY_MS
	let shifted = wallClock - offsetAt(wallClock)
	shifted = wallClock - offsetAt(shifted)
	return toMysqlDatetime(new Date(shifted).toISOString())
}

/** The club time zone's offset from UTC, in ms, at the given instant. */
function offsetAt(utcMs: number): number {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: CLUB_TIME_ZONE,
		hourCycle: "h23",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).formatToParts(new Date(utcMs))
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

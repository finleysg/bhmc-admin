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

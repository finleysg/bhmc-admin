import { AgeResult, PlayerDomainData } from "./types"

/**
 * Return "First Last" combination. Handles missing parts gracefully.
 */
export function getFullName(player: PlayerDomainData): string {
	const first = (player.firstName || "").trim()
	const last = (player.lastName || "").trim()
	if (!first && !last) return ""
	if (!first) return last
	if (!last) return first
	return `${first} ${last}`
}

function parseDate(input?: string | null): Date | null {
	if (!input) return null
	const d = new Date(input)
	if (Number.isNaN(d.getTime())) return null
	return d
}

function calculateAge(birthDate: Date, asOfDate: Date): number {
	let age = asOfDate.getFullYear() - birthDate.getFullYear()
	const monthDiff = asOfDate.getMonth() - birthDate.getMonth()
	const dayDiff = asOfDate.getDate() - birthDate.getDate()
	if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
		age--
	}
	return age
}

/**
 * Deterministic age calculation.
 *
 * - today: required Date (caller supplies current date)
 * - referenceDate: optional Date (typically event date)
 *
 * Returns numeric ages or "n/a" when birthDate is missing/invalid/future.
 *
 * - age: age as of today
 * - eventAge: age as of referenceDate (if provided) else today
 * - calendarAge: age at end of reference year (Dec 31 of reference year) or of today if no referenceDate
 */
export function getAge(player: PlayerDomainData, today: Date, referenceDate?: Date): AgeResult {
	const bd = parseDate(player.birthDate)
	if (!bd) {
		return { age: "n/a", eventAge: "n/a", calendarAge: "n/a" }
	}

	// if birthDate is in the future relative to 'today', treat as invalid
	if (bd.getTime() > today.getTime()) {
		return { age: "n/a", eventAge: "n/a", calendarAge: "n/a" }
	}

	const ref = referenceDate ?? today

	const age = calculateAge(bd, today)
	const eventAge = calculateAge(bd, ref)
	const calendarEnd = new Date(ref.getFullYear(), 11, 31)
	const calendarAge = calculateAge(bd, calendarEnd)

	return { age, eventAge, calendarAge }
}

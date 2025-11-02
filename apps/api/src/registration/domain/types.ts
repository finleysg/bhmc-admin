/**
 * Domain types for registration/player helpers.
 */

export interface PlayerDomainData {
	id?: number
	firstName?: string | null
	lastName?: string | null
	birthDate?: string | null // "YYYY-MM-DD" or ISO string
	// other fields may be present but are not required for these helpers
}

export type AgeValue = number | "n/a"

export interface AgeResult {
	age: AgeValue // age as of "today" (or provided 'today' for deterministic calls)
	eventAge: AgeValue // age as of the event/reference date
	calendarAge: AgeValue // age at end of the year of the event/reference date (or today)
}

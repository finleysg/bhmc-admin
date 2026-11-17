import { EventTypeChoices, StartTypeChoices, type EventTypeValue } from "../types"
import { parseTime } from "./time-utils"

/**
 * Rules about an event's registration dates, shared by event setup (which refuses
 * a save that breaks them) and readiness (which reports events that already do).
 */

const CLUB_TIME_ZONE = "America/Chicago"

const clubDate = new Intl.DateTimeFormat("en-CA", {
	timeZone: CLUB_TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
})

const clubClock = new Intl.DateTimeFormat("en-US", {
	timeZone: CLUB_TIME_ZONE,
	hourCycle: "h23",
	hour: "2-digit",
	minute: "2-digit",
})

/** An instant as the club's calendar date ("2027-04-28") and clock time ("09:00"). */
export function clubWallClock(iso: string): { date: string; time: string } {
	const at = new Date(iso)
	return { date: clubDate.format(at), time: clubClock.format(at) }
}

export interface EventDates {
	eventType: EventTypeValue
	/** Club-local date, "YYYY-MM-DD". */
	startDate: string
	/** Instants as ISO strings with an offset; null when not set. */
	prioritySignupStart: string | null
	signupStart: string | null
	signupEnd: string | null
	paymentsEnd: string | null
}

export type EventDateField = Exclude<keyof EventDates, "eventType">

export interface DateOrderIssue {
	/** The date the message is about. */
	field: EventDateField
	message: string
}

/**
 * Checks priority signup start ≤ signup start < signup end ≤ payments end ≤ event date.
 * Dates that are not set, or not valid dates (the field's own format check reports those),
 * are skipped. Deadlines are compared with the event by their club-local calendar date,
 * because the start time is free text. A season registration event's date is the day its
 * registration opens, so signup runs past it by design.
 */
export function dateOrderIssues(dates: EventDates): DateOrderIssue[] {
	const issues: DateOrderIssue[] = []
	const at = (iso: string | null) => {
		const ms = iso ? Date.parse(iso) : NaN
		return Number.isNaN(ms) ? null : ms
	}
	const priority = at(dates.prioritySignupStart)
	const start = at(dates.signupStart)
	const end = at(dates.signupEnd)
	const payments = at(dates.paymentsEnd)

	if (priority != null && start != null && priority > start) {
		issues.push({
			field: "signupStart",
			message: "Priority signup must start no later than signup start",
		})
	}
	if (start != null && end != null && start >= end) {
		issues.push({ field: "signupEnd", message: "Signup start must be earlier than signup end" })
	}
	if (end != null && payments != null && end > payments) {
		issues.push({ field: "paymentsEnd", message: "Payments must end no earlier than signup end" })
	}

	const deadlines: [Exclude<EventDateField, "startDate">, string | null, string][] = [
		["prioritySignupStart", dates.prioritySignupStart, "Priority signup start"],
		["signupStart", dates.signupStart, "Signup start"],
		["signupEnd", dates.signupEnd, "Signup end"],
		["paymentsEnd", dates.paymentsEnd, "Payments end"],
	]
	if (dates.eventType === EventTypeChoices.SEASON_REGISTRATION) return issues
	for (const [field, iso, label] of deadlines) {
		if (at(iso) != null && clubWallClock(iso!).date > dates.startDate) {
			issues.push({ field, message: `${label} is after the event date` })
		}
	}
	return issues
}

/**
 * When players choose tee times, the start time is the first tee time of the tee sheet,
 * so it must be a time like "2:00 PM". Otherwise it is free text ("Morning Swing").
 * Returns the problem, or null.
 */
export function startTimeIssue(e: {
	startType: string | null
	canChoose: boolean
	startTime: string | null
}): string | null {
	if (!e.canChoose || e.startType !== StartTypeChoices.TEETIMES) return null
	try {
		parseTime(e.startTime ?? "")
		return null
	} catch {
		return "Enter a start time like 2:00 PM: players choose tee times, which count from it"
	}
}

/** Registration opens at the priority signup start, or the signup start if there is none. */
export function registrationOpensAt(
	dates: Pick<EventDates, "prioritySignupStart" | "signupStart">,
): string | null {
	return dates.prioritySignupStart ?? dates.signupStart
}

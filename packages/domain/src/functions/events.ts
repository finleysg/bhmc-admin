import {
	ClubEvent,
	EventTypeChoices,
	RegistrationStatusChoices,
	RegistrationTypeChoices,
	StartTypeChoices,
} from "../types"
import { format, isValid, isWithinInterval } from "date-fns"
import { parseUtcDateTime } from "./time-utils"

const isoDayFormat = (dt: string) => {
	if (dt) {
		const date = new Date(dt)
		if (isValid(date)) {
			return format(date, "yyyy-MM-dd")
		}
	}
	return "--"
}

export function eventUrl(event: ClubEvent): string {
	return `/event/${isoDayFormat(event.startDate)}/${slugify(event.name)}`
}

export const slugify = (text: string) => {
	if (text) {
		return text
			.toString()
			.toLowerCase()
			.trim()
			.replace("/", " ")
			.replace(/\s+/g, "-")
			.replace(/[^\w-]+/g, "")
			.replace(/--+/g, "-")
	}
	return ""
}

/**
 * Returns true if the current date and time is between signup start and payments end.
 * @param {Date} now The current date and time
 * @returns boolean
 */
export function paymentsAreOpen(event: ClubEvent, now: Date = new Date()) {
	if (
		event.registrationType === RegistrationTypeChoices.NONE ||
		!event.signupStart ||
		!event.paymentsEnd
	) {
		return false
	}
	return isWithinInterval(now, {
		start: new Date(event.prioritySignupStart ?? event.signupStart),
		end: new Date(event.paymentsEnd),
	})
}

/**
 * Returns true if the given date and time is between signup start and signup end.
 * @param {Date} now The current date and time
 * @returns boolean
 */
export function registrationIsOpen(event: ClubEvent, now: Date = new Date()) {
	if (
		event.registrationType === RegistrationTypeChoices.NONE ||
		!event.signupStart ||
		!event.signupEnd
	) {
		return false
	}

	return isWithinInterval(now, {
		start: new Date(event.signupStart),
		end: new Date(event.signupEnd),
	})
}

/**
 * Returns true if the current date and time is between priority signup start and signup start.
 * @param {Date} now The current date and time
 * @returns boolean
 */
export function priorityRegistrationIsOpen(event: ClubEvent, now: Date = new Date()) {
	if (
		event.registrationType === RegistrationTypeChoices.NONE ||
		!event.prioritySignupStart ||
		!event.signupStart ||
		!event.signupEnd
	) {
		return false
	}

	return isWithinInterval(now, {
		start: new Date(event.prioritySignupStart),
		end: new Date(event.signupStart),
	})
}

export function getEventTypeName(code: string) {
	switch (code) {
		case EventTypeChoices.WEEKNIGHT:
			return "Weeknight Event"
		case EventTypeChoices.WEEKEND_MAJOR:
			return "Weekend Major"
		case EventTypeChoices.MATCH_PLAY:
			return "Season Long Match Play"
		case EventTypeChoices.MEETING:
			return "Meeting"
		case EventTypeChoices.OTHER:
			return "Other"
		case EventTypeChoices.EXTERNAL:
			return "External Event"
		case EventTypeChoices.SEASON_REGISTRATION:
			return "Season Registration"
		case EventTypeChoices.DEADLINE:
			return "Deadline"
		case EventTypeChoices.OPEN:
			return "Open Event"
		default:
			return "Unknown"
	}
}

// TODO: move to registration file
export function getStatusName(statusCode: string) {
	switch (statusCode) {
		case RegistrationStatusChoices.AVAILABLE:
			return "Available"
		case RegistrationStatusChoices.PENDING:
			return "In Progress"
		case RegistrationStatusChoices.RESERVED:
			return "Reserved"
		case RegistrationStatusChoices.AWAITING_PAYMENT:
			return "Payment Processing"
		default:
			return "Unavailable"
	}
}

export function getStartTypeName(startType?: string | null) {
	if (!startType) {
		return "Tee Times"
	}
	switch (startType) {
		case StartTypeChoices.SHOTGUN:
			return "Shotgun"
		case StartTypeChoices.TEETIMES:
			return "Tee Times"
		default:
			return "N/A"
	}
}

export function getRegistrationTypeName(registrationType: string) {
	switch (registrationType) {
		case RegistrationTypeChoices.MEMBER:
			return "Members Only"
		case RegistrationTypeChoices.MEMBER_GUEST:
			return "Guests Allowed"
		case RegistrationTypeChoices.OPEN:
			return "Open to All"
		case RegistrationTypeChoices.RETURNING_MEMBER:
			return "Returning Members Only"
		case RegistrationTypeChoices.NONE:
			return "No Signup"
		default:
			return ""
	}
}

export function registrationHasStarted(event: ClubEvent, now: Date = new Date()): boolean {
	const startDate = event.prioritySignupStart ?? event.signupStart
	if (!startDate) return false
	return now >= parseUtcDateTime(startDate)
}

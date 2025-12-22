import { ClubEvent, RegistrationTypeChoices } from "../types"
import { format, isDate, isValid, isWithinInterval } from "date-fns"

const isoDayFormat = (dt: string) => {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "yyyy-MM-dd")
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
		start: event.prioritySignupStart ?? event.signupStart,
		end: event.paymentsEnd,
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
		start: event.signupStart,
		end: event.signupEnd,
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
		start: event.prioritySignupStart,
		end: event.signupStart,
	})
}

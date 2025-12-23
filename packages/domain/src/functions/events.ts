import { ClubEvent, RegistrationTypeChoices } from "../types"
import { format, isValid, isWithinInterval } from "date-fns"

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

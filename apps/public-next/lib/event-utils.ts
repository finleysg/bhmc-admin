import { differenceInMinutes, format, parse, isValid } from "date-fns"
import { notFound } from "next/navigation"

import { fetchDjango } from "./fetchers"
import { slugify } from "./slugify"
import type { ClubEvent, ClubEventDetail, RegistrationSlot } from "./types"

export const EventType = {
	Weeknight: "N",
	Major: "W",
	MatchPlay: "S",
	Meeting: "M",
	Other: "O",
	External: "E",
	Membership: "R",
	Deadline: "D",
	Open: "P",
	Invitational: "I",
} as const

export const EventStatusType = {
	Scheduled: "S",
	Canceled: "C",
	Tentative: "T",
} as const

export const DocumentType = {
	Results: "R",
	Teetimes: "T",
	Flights: "L",
	Points: "P",
	DamCup: "D",
	MatchPlay: "M",
	Finance: "F",
	SignUp: "S",
	Data: "Z",
	Other: "O",
} as const

export const RegistrationType = {
	MembersOnly: "M",
	GuestsAllowed: "G",
	Open: "O",
	ReturningMembersOnly: "R",
	None: "N",
} as const

export function getEventTypeName(code: string) {
	switch (code) {
		case EventType.Weeknight:
			return "Weeknight Event"
		case EventType.Major:
			return "Weekend Major"
		case EventType.MatchPlay:
			return "Season Long Match Play"
		case EventType.Meeting:
			return "Meeting"
		case EventType.Other:
			return "Other"
		case EventType.External:
			return "External Event"
		case EventType.Membership:
			return "Season Registration"
		case EventType.Deadline:
			return "Deadline"
		case EventType.Open:
			return "Open Event"
		case EventType.Invitational:
			return "Invitational"
		default:
			return "Unknown"
	}
}

export function getStartTypeName(startType?: string | null) {
	if (!startType) return ""
	switch (startType) {
		case "SG":
			return "Shotgun"
		case "TT":
			return "Tee Times"
		default:
			return ""
	}
}

export function getRegistrationTypeName(code?: string | null) {
	if (!code) return ""
	switch (code) {
		case RegistrationType.MembersOnly:
			return "Members Only"
		case RegistrationType.GuestsAllowed:
			return "Guests Allowed"
		case RegistrationType.Open:
			return "Open"
		case RegistrationType.ReturningMembersOnly:
			return "Returning Members Only"
		case RegistrationType.None:
			return ""
		default:
			return ""
	}
}

export function getEventTypeColor(code: string, muted = false) {
	if (muted) {
		switch (code) {
			case EventType.Weeknight:
				return "bg-primary/20 text-primary"
			case EventType.Major:
				return "bg-secondary/20 text-secondary"
			case EventType.MatchPlay:
				return "bg-amber-600/20 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
			case EventType.Meeting:
				return "bg-muted text-muted-foreground"
			case EventType.External:
				return "bg-sky-600/20 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400"
			case EventType.Membership:
				return "bg-violet-600/20 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
			case EventType.Deadline:
				return "bg-rose-600/20 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
			case EventType.Open:
				return "bg-indigo-600/20 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
			case EventType.Invitational:
				return "bg-teal-600/20 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400"
			default:
				return "bg-muted text-muted-foreground"
		}
	}
	switch (code) {
		case EventType.Weeknight:
			return "bg-primary/80 text-primary-foreground"
		case EventType.Major:
			return "bg-secondary/80 text-secondary-foreground"
		case EventType.MatchPlay:
			return "bg-amber-600/80 text-white dark:bg-amber-500/80"
		case EventType.Meeting:
			return "bg-muted text-muted-foreground"
		case EventType.External:
			return "bg-sky-600/80 text-white dark:bg-sky-500/80"
		case EventType.Membership:
			return "bg-violet-600/80 text-white dark:bg-violet-500/80"
		case EventType.Deadline:
			return "bg-rose-600/80 text-white dark:bg-rose-500/80"
		case EventType.Open:
			return "bg-teal-600/80 text-white dark:bg-teal-500/80"
		case EventType.Invitational:
			return "bg-indigo-600/80 text-white dark:bg-indigo-500/80"
		default:
			return "bg-muted text-muted-foreground"
	}
}

export function getEventUrl(event: ClubEvent | ClubEventDetail) {
	const startDate = parse(event.start_date, "yyyy-MM-dd", new Date())
	if (!isValid(startDate)) return "#"
	const dateSlug = format(startDate, "yyyy-MM-dd")
	return `/event/${dateSlug}/${slugify(event.name)}`
}

export function findEventBySlug(
	events: ClubEventDetail[],
	dateSlug: string,
	nameSlug: string,
): ClubEventDetail | undefined {
	return events.find((e) => {
		const eventDateSlug = e.start_date
		const eventNameSlug = slugify(e.name)
		return eventDateSlug === dateSlug && eventNameSlug === nameSlug
	})
}

export function shouldShowSignUpButton(
	event: Pick<
		ClubEventDetail,
		| "registration_type"
		| "registration_window"
		| "status"
		| "can_choose"
		| "priority_signup_start"
		| "signup_start"
	>,
	now: Date,
): boolean {
	if (
		event.registration_type === RegistrationType.None ||
		event.registration_window === "past" ||
		event.status === "C"
	) {
		return false
	}

	if (event.can_choose) {
		const signupStart = event.priority_signup_start ?? event.signup_start
		if (!signupStart) return event.registration_window === "current"
		const targetDate = new Date(signupStart)
		return differenceInMinutes(targetDate, now) <= 60
	}

	return event.registration_window === "current"
}

export function getRegistrationStartTime(
	event: Pick<ClubEventDetail, "priority_signup_start" | "signup_start">,
): Date | null {
	const dateStr = event.priority_signup_start ?? event.signup_start
	if (!dateStr) return null
	return new Date(dateStr)
}

export function isPaymentsOpen(
	event: Pick<
		ClubEventDetail,
		"priority_signup_start" | "signup_start" | "signup_end" | "payments_end"
	>,
	now: Date,
): boolean {
	const startStr = event.priority_signup_start ?? event.signup_start
	const endStr = event.payments_end ?? event.signup_end
	if (!startStr || !endStr) return false
	return now >= new Date(startStr) && now < new Date(endStr)
}

export async function resolveEventFromParams(
	eventDate: string,
	eventName: string,
): Promise<ClubEventDetail> {
	const startDate = parse(eventDate, "yyyy-MM-dd", new Date())
	if (!isValid(startDate)) notFound()
	const year = startDate.getFullYear()
	const month = startDate.getMonth() + 1
	const events = await fetchDjango<ClubEventDetail[]>(`/events/?year=${year}&month=${month}`, {
		revalidate: 300,
	})
	const event = findEventBySlug(events, eventDate, eventName)
	if (!event) notFound()
	return event
}

export function computeOpenSpots(event: ClubEventDetail, slots: RegistrationSlot[]): number {
	if (event.can_choose) {
		const filled = slots.filter((s) => s.status !== "A").length
		return slots.length - filled
	}
	const filled = slots.filter((s) => s.status === "R").length
	if (event.registration_maximum) {
		return event.registration_maximum - filled
	}
	return -1
}

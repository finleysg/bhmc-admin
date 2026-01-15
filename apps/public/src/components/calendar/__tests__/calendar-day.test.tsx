import { addDays, parseISO, subDays } from "date-fns"
import { expect, test } from "vitest"

import { ClubEvent, ClubEventApiSchema } from "../../../models/club-event"
import { EventStatusType, EventType, RegistrationType } from "../../../models/codes"
import {
	renderWithAuth,
	screen,
	setupAdminUser,
	setupAuthenticatedUser,
	verifyNeverOccurs,
} from "../../../test/test-utils"
import { Day } from "../calendar"
import { CalendarDay } from "../calendar-day"

test("conditionally renders an empty date", async () => {
	const day = new Day(parseISO("2020-11-15"))

	renderWithAuth(<CalendarDay day={day} month={10} />)

	expect(screen.getByRole("listitem")).toHaveClass("hidden-xs-down")

	// Need a wait to ensure all promises are resolved in the auth provider.
	await verifyNeverOccurs(() => expect(screen.getByRole("button")).toBeVisible(), {
		timeout: 100,
	})
})

test("always renders a date with an event", async () => {
	const day = new Day(parseISO("2020-11-15"))
	day.events.push(
		new ClubEvent(
			ClubEventApiSchema.parse({
				id: 11,
				name: "event 1",
				start_date: "2020-11-15",
				signup_start: subDays(new Date("2020-11-15"), 1).toISOString(),
				signup_end: addDays(new Date("2020-11-15"), 7).toISOString(),
				rounds: 1,
				can_choose: true,
				event_type: EventType.Weeknight,
				ghin_required: true,
				registration_type: RegistrationType.MembersOnly,
				registration_window: "registration",
				season: 2020,
				status: EventStatusType.Scheduled,
				age_restriction_type: "N",
			}),
		),
	)

	renderWithAuth(<CalendarDay day={day} month={10} />)

	expect(screen.getByRole("listitem")).not.toHaveClass("hidden-xs-down")

	// Need a wait to ensure all promises are resolved in the auth provider.
	await verifyNeverOccurs(() => expect(screen.getByRole("button")).toBeVisible(), {
		timeout: 100,
	})
})

test("renders a date outside the current month with a special class", async () => {
	const day = new Day(parseISO("2020-11-15"))

	renderWithAuth(<CalendarDay day={day} month={9} />)

	expect(screen.getByRole("listitem")).toHaveClass("other-month")

	// Need a wait to ensure all promises are resolved in the auth provider.
	await verifyNeverOccurs(() => expect(screen.getByRole("button")).toBeVisible(), {
		timeout: 100,
	})
})

test("renders the current date with a special class", async () => {
	const day = new Day(new Date())

	renderWithAuth(<CalendarDay day={day} month={9} />)

	expect(screen.getByRole("listitem")).toHaveClass("today")

	// Need a wait to ensure all promises are resolved in the auth provider.
	await verifyNeverOccurs(() => expect(screen.getByRole("button")).toBeVisible(), {
		timeout: 100,
	})
})

test("renders an internal link for club events", async () => {
	const day = new Day(parseISO("2020-11-15"))
	day.events.push(
		new ClubEvent(
			ClubEventApiSchema.parse({
				id: 11,
				name: "2 Man Best Ball",
				start_date: "2020-11-15",
				signup_start: subDays(new Date("2020-11-15"), 1).toISOString(),
				signup_end: addDays(new Date("2020-11-15"), 7).toISOString(),
				rounds: 1,
				can_choose: true,
				event_type: EventType.Weeknight,
				ghin_required: true,
				registration_type: RegistrationType.MembersOnly,
				registration_window: "registration",
				season: 2020,
				status: EventStatusType.Scheduled,
				age_restriction_type: "N",
			}),
		),
	)

	renderWithAuth(<CalendarDay day={day} month={10} />)

	expect(screen.getByRole("link", { name: /2 man best ball/i })).toHaveAttribute(
		"href",
		"/event/2020-11-15/2-man-best-ball",
	)

	// Need a wait to ensure all promises are resolved in the auth provider.
	await verifyNeverOccurs(() => expect(screen.getByRole("button")).toBeVisible(), {
		timeout: 100,
	})
})

test("overrides the link to the season event", async () => {
	const day = new Day(parseISO("2020-11-15"))
	day.events.push(
		new ClubEvent(
			ClubEventApiSchema.parse({
				id: 1,
				name: "Season Sign Up",
				start_date: "2021-1-15",
				signup_start: subDays(new Date("2021-1-15"), 1).toISOString(),
				signup_end: addDays(new Date("2021-4-15"), 7).toISOString(),
				rounds: 1,
				can_choose: false,
				event_type: EventType.Membership,
				ghin_required: true,
				registration_type: RegistrationType.Open,
				registration_window: "registration",
				season: 2020,
				status: EventStatusType.Scheduled,
				age_restriction_type: "N",
			}),
		),
	)

	renderWithAuth(<CalendarDay day={day} month={10} />)

	expect(screen.getByRole("link", { name: /season sign up/i })).toHaveAttribute(
		"href",
		"/membership",
	)

	// Need a wait to ensure all promises are resolved in the auth provider.
	await verifyNeverOccurs(() => expect(screen.getByRole("button")).toBeVisible(), {
		timeout: 100,
	})
})

test("overrides the link to the match play event", async () => {
	const day = new Day(parseISO("2020-11-15"))
	day.events.push(
		new ClubEvent(
			ClubEventApiSchema.parse({
				id: 2,
				name: "Season Long Match Play",
				start_date: "2020-11-15",
				signup_start: subDays(new Date("2020-11-15"), 1).toISOString(),
				signup_end: addDays(new Date("2020-11-15"), 7).toISOString(),
				rounds: 1,
				can_choose: false,
				event_type: EventType.MatchPlay,
				ghin_required: true,
				registration_type: RegistrationType.MembersOnly,
				registration_window: "registration",
				season: 2020,
				status: EventStatusType.Scheduled,
				age_restriction_type: "N",
			}),
		),
	)

	renderWithAuth(<CalendarDay day={day} month={10} />)

	expect(screen.getByRole("link", { name: /season long match play/i })).toHaveAttribute(
		"href",
		"/match-play",
	)

	// Need a wait to ensure all promises are resolved in the auth provider.
	await verifyNeverOccurs(() => expect(screen.getByRole("button")).toBeVisible(), {
		timeout: 100,
	})
})

test("renders an external url for non-club events", async () => {
	const externalUrl = "https://mpga.net/tournaments/2020/four-ball"
	const day = new Day(parseISO("2020-11-15"))
	day.events.push(
		new ClubEvent(
			ClubEventApiSchema.parse({
				id: 11,
				name: "MPGA FourBall",
				start_date: "2020-11-15",
				signup_start: subDays(new Date("2020-11-15"), 1).toISOString(),
				signup_end: addDays(new Date("2020-11-15"), 7).toISOString(),
				rounds: 2,
				can_choose: false,
				event_type: EventType.External,
				ghin_required: false,
				registration_type: RegistrationType.None,
				registration_window: "n/a",
				season: 2020,
				status: EventStatusType.Scheduled,
				external_url: externalUrl,
				age_restriction_type: "N",
			}),
		),
	)

	renderWithAuth(<CalendarDay day={day} month={10} />)

	expect(screen.getByRole("link", { name: /mpga fourball/i })).toHaveAttribute("href", externalUrl)

	// Need a wait to ensure all promises are resolved in the auth provider.
	await verifyNeverOccurs(() => expect(screen.getByRole("button")).toBeVisible(), {
		timeout: 100,
	})
})

test("renders a link to event admin for administrators", async () => {
	const day = new Day(parseISO("2020-11-15"))
	day.events.push(
		new ClubEvent(
			ClubEventApiSchema.parse({
				id: 11,
				name: "2 Man Best Ball",
				start_date: "2020-11-15",
				signup_start: subDays(new Date("2020-11-15"), 1).toISOString(),
				signup_end: addDays(new Date("2020-11-15"), 7).toISOString(),
				rounds: 1,
				can_choose: true,
				event_type: EventType.Weeknight,
				ghin_required: true,
				registration_type: RegistrationType.MembersOnly,
				registration_window: "registration",
				season: 2020,
				status: EventStatusType.Scheduled,
				age_restriction_type: "N",
			}),
		),
	)

	setupAdminUser()

	renderWithAuth(<CalendarDay day={day} month={10} />)

	expect(await screen.findByRole("button")).toBeInTheDocument()
})

test("does not render a link to event admin for non-administrators", async () => {
	const day = new Day(parseISO("2020-11-15"))
	day.events.push(
		new ClubEvent(
			ClubEventApiSchema.parse({
				id: 11,
				name: "2 Man Best Ball",
				start_date: "2020-11-15",
				signup_start: subDays(new Date("2020-11-15"), 1).toISOString(),
				signup_end: addDays(new Date("2020-11-15"), 7).toISOString(),
				rounds: 1,
				can_choose: true,
				event_type: EventType.Weeknight,
				ghin_required: true,
				registration_type: RegistrationType.MembersOnly,
				registration_window: "registration",
				season: 2020,
				status: EventStatusType.Scheduled,
				age_restriction_type: "N",
			}),
		),
	)

	setupAuthenticatedUser()

	renderWithAuth(<CalendarDay day={day} month={10} />)

	await verifyNeverOccurs(() => expect(screen.getByRole("button")).toBeVisible(), {
		timeout: 100,
	})
})

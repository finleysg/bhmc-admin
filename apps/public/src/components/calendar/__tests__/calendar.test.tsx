import { addDays, subDays } from "date-fns"
import { expect, test } from "vitest"

import { ClubEvent, ClubEventApiSchema } from "../../../models/club-event"
import { EventStatusType, EventType, RegistrationType } from "../../../models/codes"
import { Calendar, Day } from "../calendar"

test("can create a Calendar object", () => {
	const october = new Calendar(2020, "October")

	expect(october.weeks.length).toEqual(5)
	expect(october.weeks[0].days.length).toEqual(7)
	expect(october.weeks[0].days[4].day).toEqual(1)
	expect(october.weeks[0].days[4].name).toEqual("Thursday")
})

test("can create a Day object", () => {
	const dt = new Date(1960, 9, 27) // Oct 17, 1960
	const today = new Day(dt)
	expect(today.isToday).toBe(false)
})

test("can add single day events to a Calendar", () => {
	const eventData = ClubEventApiSchema.parse({
		id: 1,
		name: "event 1",
		start_date: "2020-10-03",
		signup_start: subDays(new Date("2020-10-03"), 1).toISOString(),
		signup_end: addDays(new Date("2020-10-03"), 7).toISOString(),
		rounds: 1,
		can_choose: true,
		event_type: EventType.Weeknight,
		ghin_required: true,
		registration_type: RegistrationType.MembersOnly,
		registration_window: "registration",
		season: 2020,
		status: EventStatusType.Scheduled,
		age_restriction_type: "N",
	})
	const event1 = new ClubEvent(eventData)

	const october = new Calendar(2020, "October")

	expect(october.hasEvents()).toBe(false)

	october.addEvent(event1)

	expect(october.hasEvents()).toBe(true)

	expect(october.weeks[0].days[5].hasEvents()).toBe(false)
	expect(october.weeks[0].days[6].hasEvents()).toBe(true)
	expect(october.weeks[1].days[0].hasEvents()).toBe(false)
})

test("can add multi-day events to a Calendar", () => {
	const eventData = ClubEventApiSchema.parse({
		id: 1,
		name: "event 1",
		start_date: "2020-10-03",
		signup_start: subDays(new Date("2020-10-03"), 1).toISOString(),
		signup_end: addDays(new Date("2020-10-03"), 7).toISOString(),
		rounds: 2,
		can_choose: true,
		event_type: EventType.Weeknight,
		ghin_required: true,
		registration_type: RegistrationType.MembersOnly,
		registration_window: "registration",
		season: 2020,
		status: EventStatusType.Scheduled,
		age_restriction_type: "N",
	})
	const event1 = new ClubEvent(eventData)
	const october = new Calendar(2020, "October")

	expect(october.hasEvents()).toBe(false)

	october.addEvent(event1)

	expect(october.hasEvents()).toBe(true)

	expect(october.weeks[0].days[5].hasEvents()).toBe(false)
	expect(october.weeks[0].days[6].hasEvents()).toBe(true)
	expect(october.weeks[1].days[0].hasEvents()).toBe(true)
	expect(october.weeks[1].days[1].hasEvents()).toBe(false)
})

test("can navigate", () => {
	const december = new Calendar(2020, "December")
	expect(december.thisMonth().month).toEqual("December")
	expect(december.thisMonth().year).toEqual(2020)
	expect(december.nextMonth().month).toEqual("January")
	expect(december.nextMonth().year).toEqual(2021)
	expect(december.lastMonth().month).toEqual("November")
	expect(december.lastMonth().year).toEqual(2020)
})

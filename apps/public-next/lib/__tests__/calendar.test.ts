import {
	getMonthFromName,
	getMonthName,
	buildCalendar,
	addEventsToCalendar,
	getAdjacentMonths,
} from "../calendar"
import type { ClubEventDetail } from "../types"

function makeEvent(overrides: Partial<ClubEventDetail> = {}): ClubEventDetail {
	return {
		id: 1,
		name: "Test Event",
		rounds: 1,
		ghin_required: false,
		total_groups: null,
		status: "S",
		minimum_signup_group_size: null,
		maximum_signup_group_size: null,
		group_size: 4,
		start_type: "TT",
		can_choose: true,
		registration_window: "future",
		external_url: null,
		season: 2024,
		tee_time_splits: null,
		notes: null,
		event_type: "N",
		skins_type: null,
		season_points: 1,
		portal_url: null,
		priority_signup_start: null,
		start_date: "2024-06-15",
		start_time: null,
		registration_type: "M",
		signup_start: null,
		signup_end: null,
		signup_waves: null,
		payments_end: null,
		registration_maximum: null,
		courses: [],
		fees: [],
		default_tag: null,
		starter_time_interval: 8,
		team_size: null,
		age_restriction: null,
		age_restriction_type: "",
		...overrides,
	}
}

describe("getMonthFromName", () => {
	it("returns correct index for each month", () => {
		expect(getMonthFromName("january")).toBe(0)
		expect(getMonthFromName("june")).toBe(5)
		expect(getMonthFromName("december")).toBe(11)
	})

	it("is case insensitive", () => {
		expect(getMonthFromName("January")).toBe(0)
		expect(getMonthFromName("MARCH")).toBe(2)
		expect(getMonthFromName("aPrIl")).toBe(3)
	})

	it("returns 0 for unrecognized names", () => {
		expect(getMonthFromName("notamonth")).toBe(0)
		expect(getMonthFromName("")).toBe(0)
	})
})

describe("getMonthName", () => {
	it("returns capitalized month name for valid index", () => {
		expect(getMonthName(0)).toBe("January")
		expect(getMonthName(5)).toBe("June")
		expect(getMonthName(11)).toBe("December")
	})

	it("returns 'january' (lowercase fallback) for out-of-bounds index", () => {
		expect(getMonthName(-1)).toBe("january")
		expect(getMonthName(12)).toBe("january")
	})
})

describe("buildCalendar", () => {
	it("builds a calendar for a given month", () => {
		const cal = buildCalendar(2024, "june")
		expect(cal.year).toBe(2024)
		expect(cal.month).toBe(5)
		expect(cal.monthName).toBe("June")
	})

	it("starts each week on Sunday", () => {
		const cal = buildCalendar(2024, "june")
		// June 2024 starts on Saturday, so first week's Sunday = May 26
		expect(cal.weeks[0].days[0].date.getDay()).toBe(0) // Sunday
	})

	it("marks days outside the month as not current month", () => {
		const cal = buildCalendar(2024, "june")
		// June 2024 starts on Saturday, so first few days are May
		const firstDay = cal.weeks[0].days[0]
		expect(firstDay.isCurrentMonth).toBe(false)
		expect(firstDay.date.getMonth()).toBe(4) // May
	})

	it("marks days inside the month as current month", () => {
		const cal = buildCalendar(2024, "june")
		// June 1 is on Saturday (day index 6 of the first week)
		const june1 = cal.weeks[0].days[6]
		expect(june1.isCurrentMonth).toBe(true)
		expect(june1.day).toBe(1)
	})

	it("each week has 7 days", () => {
		const cal = buildCalendar(2024, "june")
		for (const week of cal.weeks) {
			expect(week.days).toHaveLength(7)
		}
	})

	it("handles months that need 5 weeks (April 2024)", () => {
		// April 2024: starts on Monday, 30 days → 5 weeks
		const cal = buildCalendar(2024, "april")
		expect(cal.weeks.length).toBe(5)
	})

	it("handles months that need 6 weeks (June 2024)", () => {
		// June 2024: starts on Saturday, 30 days → 6 weeks
		const cal = buildCalendar(2024, "june")
		expect(cal.weeks.length).toBe(6)
	})

	it("handles leap year February correctly", () => {
		const cal = buildCalendar(2024, "february")
		// Feb 2024 has 29 days (leap year)
		const allDays = cal.weeks.flatMap((w) => w.days).filter((d) => d.isCurrentMonth)
		expect(allDays).toHaveLength(29)
	})

	it("handles non-leap year February correctly", () => {
		const cal = buildCalendar(2023, "february")
		const allDays = cal.weeks.flatMap((w) => w.days).filter((d) => d.isCurrentMonth)
		expect(allDays).toHaveLength(28)
	})
})

describe("addEventsToCalendar", () => {
	it("adds a single-day event to the correct day", () => {
		const cal = buildCalendar(2024, "june")
		const event = makeEvent({ start_date: "2024-06-15", rounds: 1 })
		addEventsToCalendar(cal, [event])

		const june15 = cal.weeks
			.flatMap((w) => w.days)
			.find((d) => d.isCurrentMonth && d.day === 15)
		expect(june15).toBeDefined()
		expect(june15?.events).toHaveLength(1)
		expect(june15?.events[0].id).toBe(1)
	})

	it("adds a multi-day event spanning multiple days", () => {
		const cal = buildCalendar(2024, "june")
		const event = makeEvent({ start_date: "2024-06-14", rounds: 3 })
		addEventsToCalendar(cal, [event])

		const daysWithEvent = cal.weeks
			.flatMap((w) => w.days)
			.filter((d) => d.events.length > 0)
		expect(daysWithEvent).toHaveLength(3)
		expect(daysWithEvent.map((d) => d.day)).toEqual([14, 15, 16])
	})

	it("treats null rounds as single-day", () => {
		const cal = buildCalendar(2024, "june")
		const event = makeEvent({ start_date: "2024-06-15", rounds: null })
		addEventsToCalendar(cal, [event])

		const daysWithEvent = cal.weeks
			.flatMap((w) => w.days)
			.filter((d) => d.events.length > 0)
		expect(daysWithEvent).toHaveLength(1)
	})

	it("does not add events outside the visible calendar range", () => {
		const cal = buildCalendar(2024, "june")
		const event = makeEvent({ start_date: "2024-07-15" })
		addEventsToCalendar(cal, [event])

		const daysWithEvent = cal.weeks
			.flatMap((w) => w.days)
			.filter((d) => d.events.length > 0)
		expect(daysWithEvent).toHaveLength(0)
	})

	it("adds events to adjacent month days that are visible", () => {
		const cal = buildCalendar(2024, "june")
		// June 2024 first visible day is May 26 (Sunday)
		const event = makeEvent({ start_date: "2024-05-26" })
		addEventsToCalendar(cal, [event])

		const daysWithEvent = cal.weeks
			.flatMap((w) => w.days)
			.filter((d) => d.events.length > 0)
		expect(daysWithEvent).toHaveLength(1)
		expect(daysWithEvent[0].isCurrentMonth).toBe(false)
	})
})

describe("getAdjacentMonths", () => {
	it("returns previous and next months", () => {
		const result = getAdjacentMonths(2024, 5) // June
		expect(result.prev).toEqual({ year: 2024, month: "may" })
		expect(result.next).toEqual({ year: 2024, month: "july" })
	})

	it("handles January → December year boundary", () => {
		const result = getAdjacentMonths(2024, 0) // January
		expect(result.prev).toEqual({ year: 2023, month: "december" })
		expect(result.next).toEqual({ year: 2024, month: "february" })
	})

	it("handles December → January year boundary", () => {
		const result = getAdjacentMonths(2024, 11) // December
		expect(result.prev).toEqual({ year: 2024, month: "november" })
		expect(result.next).toEqual({ year: 2025, month: "january" })
	})
})

import {
	addDays,
	addMonths,
	isSameDay,
	isSameMonth,
	isWithinInterval,
	startOfWeek,
	subMonths,
} from "date-fns"

import { ClubEvent } from "../../models/club-event"
import { dayNameFormat, monthNameFormat, shortDayNameFormat } from "../../utils/date-utils"

export function getMonth(name: string, zeroBased = true) {
	let m = 0
	switch (name.toLowerCase()) {
		case "january":
		case "jan":
			m = 0
			break
		case "february":
		case "feb":
			m = 1
			break
		case "march":
		case "mar":
			m = 2
			break
		case "april":
		case "apr":
			m = 3
			break
		case "may":
			m = 4
			break
		case "june":
		case "jun":
			m = 5
			break
		case "july":
		case "jul":
			m = 6
			break
		case "august":
		case "aug":
			m = 7
			break
		case "september":
		case "sep":
			m = 8
			break
		case "october":
		case "oct":
			m = 9
			break
		case "november":
		case "nov":
			m = 10
			break
		case "december":
		case "dec":
			m = 11
			break
		default:
			m = 0
			break
	}
	if (!zeroBased) {
		m += 1
	}
	return m
}

export function getMonthName(month: number, zeroBased = true) {
	let name = "Invalid"
	if (!zeroBased) {
		month -= 1
	}
	switch (month) {
		case 0:
			name = "January"
			break
		case 1:
			name = "February"
			break
		case 2:
			name = "March"
			break
		case 3:
			name = "April"
			break
		case 4:
			name = "May"
			break
		case 5:
			name = "June"
			break
		case 6:
			name = "July"
			break
		case 7:
			name = "August"
			break
		case 8:
			name = "September"
			break
		case 9:
			name = "October"
			break
		case 10:
			name = "November"
			break
		case 11:
			name = "December"
			break
		default:
			name = "Invalid"
			break
	}
	return name
}

/**
 * Represents a calendar day with a collection of zero to many events.
 * @constructor
 * @param {Date} date - The date as a javascript date.
 */
export class Day {
	date: Date
	day: number
	name: string
	shortName: string
	isToday: boolean
	events: ClubEvent[]

	constructor(dt: Date) {
		this.date = dt
		this.name = dayNameFormat(dt)
		this.shortName = shortDayNameFormat(dt)
		this.day = dt.getDate() // parseInt(date.format("D"), 10)
		this.isToday = isSameDay(dt, new Date())
		this.events = []
	}

	public hasEvents = () => {
		return this.events.length > 0
	}
}

/**
 * Represents a calendar day with a collection of zero to many events.
 * @constructor
 * @param {number} week - The week (number) of the month.
 * @param {Day[]} days - The days of the week.
 */
export class Week {
	week: number
	days: Day[]

	constructor(week: number, days: Day[]) {
		this.week = week
		this.days = days
	}
}

/**
 * Represents a calendar month with a collection of weeks, which
 * each have a collection of days. Every week is a full 7 days, so
 * days from the previous and following months are included.
 * @constructor
 * @param {number} year - The year.
 * @param {string} monthName - The name of the month.
 */
export class Calendar {
	year: number
	month: number
	monthName: string
	firstDay: Date
	sunday: Date
	weeks: Week[]

	constructor(year: number, monthName: string) {
		this.year = year
		this.month = getMonth(monthName)
		this.monthName = monthName
		this.firstDay = new Date(year, getMonth(monthName, true), 1)
		this.sunday = startOfWeek(this.firstDay)
		this.weeks = this.buildMonth(this.sunday, this.firstDay)
	}

	/**
	 * Create the collection of weeks for this calendar month.
	 * @param {Date} firstSunday - The Sunday before the start of the month.
	 * @param {Date} firstDay - The first day of the month.
	 */
	buildMonth = (firstSunday: Date, firstDay: Date) => {
		const weeks = []
		for (let i = 0; i < 6; i++) {
			const days = this.buildWeek(addDays(firstSunday, i * 7))
			if (i === 0 || isSameMonth(firstDay, days[0].date)) {
				weeks.push({ week: i, days })
			}
		}
		return weeks
	}

	/**
	 * Create a given week in the month
	 * @param {Date} sunday - The Sunday of this week.
	 */
	buildWeek = (sunday: Date) => {
		const days = []
		for (let i = 0; i < 7; i++) {
			days.push(new Day(addDays(sunday, i)))
		}
		return days
	}

	/**
	 * Add a club event, which is associated with the day(s) in the
	 * calendar based on the start date and # of rounds.
	 * @param {ClubEvent} event - The club event to add to the calendar.
	 */
	addEvent = (event: ClubEvent) => {
		for (const week of this.weeks) {
			for (const day of week.days) {
				const addEvent = isWithinInterval(day.date, {
					start: event.startDate,
					end: event.endDate ?? event.startDate,
				})
				if (addEvent) {
					day.events.push(event)
				}
			}
		}
	}

	/**
	 * Does this calendar month have any club events?
	 */
	hasEvents = () => {
		let result = false
		for (const week of this.weeks) {
			for (const day of week.days) {
				if (day.hasEvents()) {
					result = true
					break
				}
			}
		}
		return result
	}

	/**
	 * Returns the current year and long month name.
	 */
	thisMonth = () => {
		return {
			year: this.firstDay.getFullYear(),
			month: monthNameFormat(this.firstDay),
		}
	}

	/**
	 * Returns the following year and long month name.
	 */
	nextMonth = () => {
		const nextMonth = addMonths(this.firstDay, 1)
		return {
			year: nextMonth.getFullYear(),
			month: monthNameFormat(nextMonth),
		}
	}

	/**
	 * Returns the previous year and long month name.
	 */
	lastMonth = () => {
		const lastMonth = subMonths(this.firstDay, 1)
		return {
			year: lastMonth.getFullYear(),
			month: monthNameFormat(lastMonth),
		}
	}
}

import {
	addDays,
	addMonths,
	isSameDay,
	isSameMonth,
	isWithinInterval,
	parse,
	startOfWeek,
	subMonths,
	format,
} from "date-fns"

import type { ClubEventDetail } from "./types"

export interface CalendarDay {
	date: Date
	day: number
	isToday: boolean
	isCurrentMonth: boolean
	events: ClubEventDetail[]
}

export interface CalendarWeek {
	week: number
	days: CalendarDay[]
}

export interface CalendarMonth {
	year: number
	month: number
	monthName: string
	firstDay: Date
	weeks: CalendarWeek[]
}

const monthNames = [
	"january",
	"february",
	"march",
	"april",
	"may",
	"june",
	"july",
	"august",
	"september",
	"october",
	"november",
	"december",
]

export function getMonthFromName(name: string): number {
	const index = monthNames.indexOf(name.toLowerCase())
	return index >= 0 ? index : 0
}

export function getMonthName(month: number): string {
	const name = monthNames[month]
	if (!name) return "january"
	return name.charAt(0).toUpperCase() + name.slice(1)
}

function buildWeek(sunday: Date, firstDay: Date): CalendarDay[] {
	const today = new Date()
	const days: CalendarDay[] = []
	for (let i = 0; i < 7; i++) {
		const date = addDays(sunday, i)
		days.push({
			date,
			day: date.getDate(),
			isToday: isSameDay(date, today),
			isCurrentMonth: isSameMonth(date, firstDay),
			events: [],
		})
	}
	return days
}

function buildMonth(sunday: Date, firstDay: Date): CalendarWeek[] {
	const weeks: CalendarWeek[] = []
	for (let i = 0; i < 6; i++) {
		const days = buildWeek(addDays(sunday, i * 7), firstDay)
		if (i === 0 || isSameMonth(firstDay, days[0].date)) {
			weeks.push({ week: i, days })
		}
	}
	return weeks
}

export function buildCalendar(year: number, monthName: string): CalendarMonth {
	const month = getMonthFromName(monthName)
	const firstDay = new Date(year, month, 1)
	const sunday = startOfWeek(firstDay)
	const weeks = buildMonth(sunday, firstDay)

	return {
		year,
		month,
		monthName: getMonthName(month),
		firstDay,
		weeks,
	}
}

export function addEventsToCalendar(calendar: CalendarMonth, events: ClubEventDetail[]): void {
	for (const event of events) {
		const startDate = parse(event.start_date, "yyyy-MM-dd", new Date())
		const rounds = event.rounds ?? 1
		const endDate = rounds <= 1 ? startDate : addDays(startDate, rounds - 1)

		for (const week of calendar.weeks) {
			for (const day of week.days) {
				if (isWithinInterval(day.date, { start: startDate, end: endDate })) {
					day.events.push(event)
				}
			}
		}
	}
}

export function getAdjacentMonths(year: number, month: number) {
	const current = new Date(year, month, 1)
	const prev = subMonths(current, 1)
	const next = addMonths(current, 1)

	return {
		prev: {
			year: prev.getFullYear(),
			month: format(prev, "MMMM").toLowerCase(),
		},
		next: {
			year: next.getFullYear(),
			month: format(next, "MMMM").toLowerCase(),
		},
	}
}

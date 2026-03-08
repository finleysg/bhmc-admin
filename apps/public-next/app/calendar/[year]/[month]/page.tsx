export const dynamic = "force-dynamic"

import { fetchDjango } from "@/lib/fetchers"
import {
	buildCalendar,
	addEventsToCalendar,
	getMonthFromName,
	getAdjacentMonths,
} from "@/lib/calendar"
import type { ClubEventDetail } from "@/lib/types"
import { CalendarHeader } from "./components/calendar-header"
import { CalendarGrid } from "./components/calendar-grid"
import { CalendarMobileList } from "./components/calendar-mobile-list"

interface CalendarPageProps {
	params: Promise<{ year: string; month: string }>
}

export default async function CalendarPage({ params }: CalendarPageProps) {
	const { year: yearParam, month: monthParam } = await params
	const year = parseInt(yearParam, 10)
	const month = getMonthFromName(monthParam)

	const events = await fetchDjango<ClubEventDetail[]>(`/events/?season=${year}`, {
		revalidate: 300,
		tags: ["events"],
	})

	const calendar = buildCalendar(year, monthParam)
	addEventsToCalendar(calendar, events)

	const { prev, next } = getAdjacentMonths(year, month)

	return (
		<div>
			<CalendarHeader monthName={calendar.monthName} year={year} prev={prev} next={next} />
			<div className="hidden md:block">
				<CalendarGrid calendar={calendar} />
			</div>
			<div className="md:hidden">
				<CalendarMobileList calendar={calendar} />
			</div>
		</div>
	)
}

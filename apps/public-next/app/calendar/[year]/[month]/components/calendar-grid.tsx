import type { CalendarMonth } from "@/lib/calendar"
import { CalendarDayCell } from "./calendar-day-cell"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface CalendarGridProps {
	calendar: CalendarMonth
}

export function CalendarGrid({ calendar }: CalendarGridProps) {
	return (
		<div className="overflow-hidden rounded-lg border">
			<div className="grid grid-cols-7">
				{WEEKDAYS.map((day) => (
					<div
						key={day}
						className="border-b border-r bg-muted/50 p-2 text-center text-xs font-medium text-muted-foreground"
					>
						{day}
					</div>
				))}
			</div>
			{calendar.weeks.map((week) => (
				<div key={week.week} className="grid grid-cols-7">
					{week.days.map((day) => (
						<CalendarDayCell key={day.date.toISOString()} day={day} />
					))}
				</div>
			))}
		</div>
	)
}

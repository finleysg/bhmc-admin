import { cn } from "@/lib/utils"
import type { CalendarDay } from "@/lib/calendar"
import { CalendarEventLink } from "./calendar-event-link"

interface CalendarDayCellProps {
	day: CalendarDay
}

export function CalendarDayCell({ day }: CalendarDayCellProps) {
	return (
		<div className={cn("min-h-24 border-b border-r p-1", !day.isCurrentMonth && "bg-muted/30")}>
			<span
				className={cn(
					"inline-flex size-6 items-center justify-center rounded-full text-xs",
					day.isToday && "bg-primary font-bold text-primary-foreground",
					!day.isCurrentMonth && "text-muted-foreground",
				)}
			>
				{day.day}
			</span>
			{day.events.map((event) => (
				<CalendarEventLink key={event.id} event={event} />
			))}
		</div>
	)
}

import { dayDateAndTimeFormat } from "../../utils/date-utils"
import { Day } from "./calendar"
import { CalendarEvent } from "./calendar-event"

interface CalendarDayProps {
	day: Day
	month: number
}

export function CalendarDay({ day, month }: CalendarDayProps) {
	const dayClasses = () => {
		const classes = []
		if (day.isToday) classes.push("today")
		if (day.date.getMonth() !== month) classes.push("other-month")
		if (!day.hasEvents()) classes.push("hidden-xs-down")
		return classes.length > 0 ? classes.join(" ") : ""
	}

	return (
		<li className={dayClasses()}>
			<div className="date hidden-xs-down">{day.day}</div>
			<div className="date hidden-sm-up">{dayDateAndTimeFormat(day.date)}</div>
			{day.hasEvents() &&
				day.events.map((evt) => {
					return <CalendarEvent key={evt.id} clubEvent={evt} />
				})}
		</li>
	)
}

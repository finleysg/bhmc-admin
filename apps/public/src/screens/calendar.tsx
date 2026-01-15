import { useParams } from "react-router-dom"

import { getMonth } from "../components/calendar/calendar"
import { EventCalendar } from "../components/calendar/event-calendar"
import { useClubEvents } from "../hooks/use-club-events"

export function CalendarScreen() {
	const { year, monthName } = useParams()
	const season = year ? +year : 0
	const month = monthName ? getMonth(monthName) : 0

	const { data: events } = useClubEvents(season)

	const currentEvents = events?.filter((evt) => evt.isCurrent(season, month)) ?? []

	return (
		<div className="row" style={{ minHeight: "calc(100vh - 216px)" }}>
			<div className="col-md-12">
				<EventCalendar
					year={season}
					monthName={monthName ?? "January"}
					events={currentEvents}
					loading={false}
				/>
			</div>
		</div>
	)
}

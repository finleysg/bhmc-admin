import { IconContext } from "react-icons"
import { IoIosSkipBackward, IoIosSkipForward } from "react-icons/io"

import { IconButton } from "../buttons/icon-button"
import { Calendar } from "./calendar"
import { MonthMenu } from "./month-menu"
import { YearMenu } from "./year-menu"

interface CalendarHeaderProps {
	calendar: Calendar
}

export function CalendarHeader({ calendar }: CalendarHeaderProps) {
	return (
		<IconContext.Provider value={{ color: "white", className: "month-nav" }}>
			<header>
				<div className="month-title">
					<IconButton
						to={`/calendar/${calendar.lastMonth().year}/${calendar.lastMonth().month.toLowerCase()}`}
						color="transparent"
					>
						<IoIosSkipBackward />
					</IconButton>
					<div style={{ display: "inline-block" }}>
						<MonthMenu currentYear={calendar.thisMonth().year} style={{ display: "inline-block" }}>
							<span style={{ cursor: "pointer", margin: 0 }}>{calendar.thisMonth().month}</span>
						</MonthMenu>{" "}
						<YearMenu currentMonth={calendar.thisMonth().month} style={{ display: "inline-block" }}>
							<span style={{ cursor: "pointer", margin: 0 }}>{calendar.thisMonth().year}</span>
						</YearMenu>
					</div>
					<IconButton
						to={`/calendar/${calendar.nextMonth().year}/${calendar.nextMonth().month.toLowerCase()}`}
						color="transparent"
					>
						<IoIosSkipForward />
					</IconButton>
				</div>
			</header>
		</IconContext.Provider>
	)
}

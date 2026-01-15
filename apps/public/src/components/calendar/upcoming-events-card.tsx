import { addDays, isWithinInterval, subDays } from "date-fns"
import { Link } from "react-router-dom"

import { useClubEvents } from "../../hooks/use-club-events"
import { EventStatusType } from "../../models/codes"
import { ClubEventProps } from "../../models/common-props"
import { dayAndDateFormat } from "../../utils/date-utils"
import { AdminLinkButton } from "../buttons/admin-link-button"
import { OverlaySpinner } from "../spinners/overlay-spinner"

function UpcomingEvent({ clubEvent }: ClubEventProps) {
	return (
		<Link className="listview__item mb-3" to={clubEvent.eventUrl}>
			<i className={`avatar-char ${clubEvent.eventTypeClass}`}>{clubEvent.name[0]}</i>
			<div
				className={`listview__content ${clubEvent.status === EventStatusType.Canceled ? "canceled" : ""}`}
			>
				<div className="listview__heading">{clubEvent.name}</div>
				<p className="text-secondary">{dayAndDateFormat(clubEvent.startDate)}</p>
			</div>
		</Link>
	)
}

export function UpcomingEventsCard() {
	const { data: events, status, fetchStatus } = useClubEvents()

	const upcoming = () => {
		if (events && events.length > 0) {
			const threeDaysAgo = subDays(new Date(), 3)
			const twoWeeksFromNow = addDays(new Date(), 14)
			return events.filter((e) => {
				if (
					"MNOPW".indexOf(e.eventType) >= 0 &&
					isWithinInterval(e.startDate, { start: threeDaysAgo, end: twoWeeksFromNow })
				) {
					return true
				}
				return false
			})
		}
		return []
	}

	return (
		<div className="card mb-4">
			<div className="card-body">
				<OverlaySpinner loading={status === "pending" || fetchStatus === "fetching"} />
				<h4 className="card-header mb-3">Upcoming Events</h4>
				<div className="listview">
					{upcoming().map((event) => (
						<div style={{ position: "relative" }} key={event.id}>
							<UpcomingEvent clubEvent={event} />
							<AdminLinkButton
								to={event.adminUrl}
								label="Event administration home"
								color="transparent"
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

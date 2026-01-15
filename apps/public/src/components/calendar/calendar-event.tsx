import React from "react"

import { Link } from "react-router-dom"

import { ClubEvent } from "../../models/club-event"
import { EventType } from "../../models/codes"
import { AdminLinkButton } from "../buttons/admin-link-button"

interface CalendarEventProps {
	clubEvent: ClubEvent
}
function CalendarEvent({ clubEvent }: CalendarEventProps) {
	const { name, eventTypeClass, externalUrl, startTime, startType } = clubEvent

	const eventUrl = () => {
		if (clubEvent.eventType === EventType.Membership) {
			return "/membership"
		} else if (clubEvent.eventType === EventType.MatchPlay) {
			return "/match-play"
		} else {
			return clubEvent.eventUrl
		}
	}

	const showStartType = startType === "Shotgun" || startType === "Tee Times"

	return (
		<React.Fragment>
			{externalUrl ? (
				<a target="_blank" rel="noreferrer" href={externalUrl}>
					<div className={`calendar-event ${eventTypeClass}`}>
						<p>{name}</p>
						<p>{startTime}</p>
					</div>
				</a>
			) : (
				<div
					className={clubEvent.status === "Canceled" ? "canceled" : ""}
					style={{
						position: "relative",
						display: "inline-block",
						width: "100%",
					}}
				>
					<Link to={eventUrl()}>
						<div className={`calendar-event ${eventTypeClass} ${clubEvent.status.toLowerCase()}`}>
							<p>{name}</p>
							<p>
								{startTime} {showStartType && startType}
							</p>
						</div>
					</Link>
					<AdminLinkButton to={clubEvent.adminUrl} label="Event administration home" />
				</div>
			)}
		</React.Fragment>
	)
}

export { CalendarEvent }

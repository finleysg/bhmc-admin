import { ComponentPropsWithoutRef } from "react"

import { format } from "date-fns"
import { Link } from "react-router-dom"

import { useClubEvents } from "../../hooks/use-club-events"
import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import { usePlayerRegistrations } from "../../hooks/use-player-registrations"
import { EventType } from "../../models/codes"
import { currentSeason } from "../../utils/app-config"

interface EventRegistration {
	id: number
	name: string
	startDate: Date
	eventType: string
	eventUrl: string
	signedUpBy: string
	signupDate: Date
}

interface EventCardProps extends ComponentPropsWithoutRef<"div"> {
	registration: EventRegistration
}

function EventCard({ registration }: EventCardProps) {
	const eventUrl = () => {
		if (registration.eventType === EventType.Membership) {
			return "/membership"
		} else if (registration.eventType === EventType.MatchPlay) {
			return "/match-play"
		} else {
			return registration.eventUrl
		}
	}

	return (
		<Link to={eventUrl()} className="d-block mb-2">
			<p className="fw-bold mb-0">
				<span>{format(registration.startDate, "MMM d, yyyy")}:</span>{" "}
				<span>{registration.name}</span>
			</p>
			<small className="text-secondary">
				Signed up by {registration.signedUpBy} on{" "}
				{format(registration.signupDate, "MM/dd/yyyy h:mm aaaa")}
			</small>
		</Link>
	)
}

export function MyEvents() {
	const { data: player } = useMyPlayerRecord()
	const { data: events } = useClubEvents()
	const { data: registrations } = usePlayerRegistrations(player?.id, currentSeason)

	const eventList = () => {
		if (!events || !registrations || registrations.length === 0) {
			return []
		}
		return registrations
			.map((r) => {
				const clubEvent = events.find((e) => e.id === r.eventId)
				if (clubEvent) {
					return {
						id: clubEvent.id,
						name: clubEvent.name,
						startDate: clubEvent.startDate,
						eventType: clubEvent.eventType,
						eventUrl: clubEvent.eventUrl,
						signedUpBy: r.signedUpBy,
						signupDate: r.createdDate,
					}
				}
			})
			.filter((evt): evt is EventRegistration => evt !== undefined)
	}

	return (
		<div className="card mb-4">
			<div className="card-body">
				<h4 className="card-header mb-2">My {currentSeason} Events</h4>
				<div className="card-text">
					<div className="row p-1">
						<div className="col-12">
							{eventList().map((evt) => {
								return <EventCard key={evt.id} registration={evt} />
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

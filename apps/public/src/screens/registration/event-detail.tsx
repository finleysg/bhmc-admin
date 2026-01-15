import { isValid, parse } from "date-fns"
import { Outlet, useNavigate, useOutletContext, useParams } from "react-router-dom"

import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { useClubEvents } from "../../hooks/use-club-events"
import { ClubEvent } from "../../models/club-event"
import { EventRegistrationProvider } from "../../context/registration-context-provider"
import { useEffect } from "react"

export type ClubEventContextType = { clubEvent: ClubEvent }

export function EventDetailScreen() {
	const { eventDate, eventName } = useParams()
	const navigate = useNavigate()

	const startDate = eventDate ? parse(eventDate, "yyyy-MM-dd", new Date()) : new Date()
	const year = isValid(startDate) ? startDate.getFullYear() : new Date().getFullYear()
	const { data: clubEvents } = useClubEvents(year)
	const { found, clubEvent } = ClubEvent.getClubEvent(clubEvents ?? [], eventDate, eventName)

	useEffect(() => {
		if (!eventDate || !eventName) navigate("/home", { replace: true })
	}, [eventDate, eventName, navigate])

	return (
		<div className="content__inner">
			<OverlaySpinner loading={!clubEvents} />
			{!clubEvents ? null : !found ? <p>Event not found</p> : null}
			{clubEvent && (
				<EventRegistrationProvider clubEvent={clubEvent}>
					<Outlet context={{ clubEvent } satisfies ClubEventContextType} />
				</EventRegistrationProvider>
			)}
		</div>
	)
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrentEvent() {
	return useOutletContext<ClubEventContextType>()
}

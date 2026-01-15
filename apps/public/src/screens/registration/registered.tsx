import { isValid, parse } from "date-fns"
import { useNavigate, useParams } from "react-router-dom"

import { ReservedGrid } from "../../components/reserve/reserved-grid"
import { ReservedList } from "../../components/reserve/reserved-list"
import { LoadingSpinner } from "../../components/spinners/loading-spinner"
import { useClubEvents } from "../../hooks/use-club-events"
import { ClubEvent } from "../../models/club-event"
import { useEffect } from "react"

export function RegisteredScreen() {
	const { eventDate, eventName } = useParams()
	const navigate = useNavigate()

	const startDate = eventDate ? parse(eventDate, "yyyy-MM-dd", new Date()) : new Date()
	const year = isValid(startDate) ? startDate.getFullYear() : new Date().getFullYear()
	const { data: clubEvents } = useClubEvents(year)
	const { found, clubEvent } = ClubEvent.getClubEvent(clubEvents, eventDate, eventName)

	useEffect(() => {
		if (!eventDate || !eventName) {
			navigate("/home") // invalid url
		}
	}, [eventDate, eventName, navigate])

	return (
		<div className="content__inner">
			<LoadingSpinner loading={!found} paddingTop="100px" />
			{clubEvent && clubEvent.canChoose && <ReservedGrid clubEvent={clubEvent} />}
			{clubEvent && !clubEvent.canChoose && <ReservedList clubEvent={clubEvent} />}
		</div>
	)
}

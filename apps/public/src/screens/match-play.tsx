import { useEffect } from "react"

import { useNavigate } from "react-router-dom"

import { useClubEvents } from "../hooks/use-club-events"
import { EventType } from "../models/codes"
import { currentSeason } from "../utils/app-config"

export function MatchPlayScreen() {
	const navigate = useNavigate()
	const { data: clubEvents } = useClubEvents(currentSeason)

	useEffect(() => {
		if (clubEvents && clubEvents.length > 0) {
			// most recent season registration event
			const evt = clubEvents.find((e) => e.eventType === EventType.MatchPlay)
			if (evt) {
				navigate(evt.eventUrl)
			}
		}
	}, [clubEvents, navigate])

	return (
		<div className="content__inner">
			<p>No match play event found for {currentSeason}.</p>
		</div>
	)
}

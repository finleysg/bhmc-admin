import { useState } from "react"

import { Link } from "react-router-dom"
import { toast } from "react-toastify"

import { CardContent } from "../../components/card/content"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { CopyEventHandler } from "../../forms/copy-event-handler"
import { useClubEvents } from "../../hooks/use-club-events"
import { ClubEvent } from "../../models/club-event"
import { currentSeason } from "../../utils/app-config"
import { SeasonSelect } from "../season-select"

const startingYear = 2020

export function CloneEventsScreen() {
	const [season, setSeason] = useState(currentSeason)
	const [newEvent, setNewEvent] = useState<ClubEvent | null>(null)
	const { data: events, status } = useClubEvents(season)

	const handleSeasonSelect = (season: number) => {
		setSeason(season)
	}

	const handleCopyComplete = (event: ClubEvent) => {
		setNewEvent(event)
		toast.success("A new event has been created.")
	}

	return (
		<div className="row">
			<div className="col-lg-4 col-md-6 col-sm-12 offset-lg-4 offset-md-3">
				<OverlaySpinner loading={status === "pending"} />
				<CardContent contentKey="copy-event">
					<>
						<SeasonSelect
							season={currentSeason - 1}
							startAt={startingYear}
							onSelect={handleSeasonSelect}
						/>
						{events && (
							<CopyEventHandler events={events} season={season} onComplete={handleCopyComplete} />
						)}
						{newEvent && (
							<div>
								<h5 className="text-success">New Event: {newEvent.name}</h5>
								<h6 className="text-secondary">{newEvent.startDateString}</h6>
								<ul className="nav flex-column">
									<li className="nav-item">
										<Link to={newEvent.eventUrl} target="_blank">
											Event Detail
										</Link>
									</li>
									<li className="nav-item">
										<Link to={newEvent.adminUrl} target="_blank">
											Event Administration
										</Link>
									</li>
									<li className="nav-item">
										<Link
											to={`https://api.bhmc.org/admin/events/event/${newEvent.id}/change/`}
											target="_blank"
										>
											Event Settings
										</Link>
									</li>
								</ul>
							</div>
						)}
					</>
				</CardContent>
			</div>
		</div>
	)
}

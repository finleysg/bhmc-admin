import { ComponentPropsWithoutRef } from "react"

import { useClubEvents } from "../../hooks/use-club-events"
import { ClubEvent } from "../../models/club-event"

interface EventSelectorProps extends ComponentPropsWithoutRef<"select"> {
	season: number
	eventType: string | undefined
	onSelectEvent: (selectedEvent: ClubEvent) => void
}

export function EventSelector({ season, eventType, onSelectEvent, ...rest }: EventSelectorProps) {
	const { data } = useClubEvents(season)
	const options = eventType
		? data
				?.filter((e) => e.eventType === eventType)
				.map((e) => {
					return {
						value: e.id,
						name: `${e.startDateString} ${e.name}`,
					}
				}) || []
		: data?.map((e) => {
				return {
					value: e.id,
					name: `${e.startDateString} ${e.name}`,
				}
			}) || []

	return (
		<div className="form-group mb-2">
			<label htmlFor="event-selector">Event</label>
			<select
				{...rest}
				id="event-selector"
				className="form-control"
				onChange={(e) => {
					const selectedEvent = data?.find((ev) => ev.id === +e.target.value)
					if (selectedEvent) {
						onSelectEvent(selectedEvent)
					}
				}}
			>
				<option key={0} value={""}>
					-- Select --
				</option>
				{options.map((opt) => {
					return (
						<option key={opt.value} value={opt.value}>
							{opt.name}
						</option>
					)
				})}
			</select>
		</div>
	)
}

import { useState } from "react"

import { EventSelector } from "../../components/events/event-selector"
import { ClubEvent } from "../../models/club-event"
import { EventType } from "../../models/codes"
import { currentSeason } from "../../utils/app-config"

interface ChangeEventProps {
	onChange: (event: ClubEvent) => void
	onCancel: () => void
}

export function ChangeEvent({ onChange, onCancel }: ChangeEventProps) {
	const [targetEvent, setTargetEvent] = useState<ClubEvent | null>(null)

	const handleSelect = (event: ClubEvent) => {
		setTargetEvent(event)
	}

	const handleSwap = () => {
		if (targetEvent) {
			onChange(targetEvent)
			setTargetEvent(null)
		}
	}

	return (
		<div className="card border border-warning">
			<div className="card-body">
				<h4 className="card-header text-warning mb-2">Change registration</h4>
				<EventSelector
					season={currentSeason}
					eventType={EventType.Major}
					onSelectEvent={handleSelect}
				/>
				<p className="mt-2 fw-bold text-warning-emphasis">
					Selected event: {targetEvent ? targetEvent.name : "none selected"}
				</p>
				<div className="card-footer d-flex justify-content-end pb-0">
					<button className="btn btn-light btn-sm me-2 mt-2" onClick={onCancel}>
						Cancel
					</button>
					<button
						disabled={!targetEvent}
						className="btn btn-warning btn-sm mt-2"
						onClick={handleSwap}
					>
						Confirm Change
					</button>
				</div>
			</div>
		</div>
	)
}

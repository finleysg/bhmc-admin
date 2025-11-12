"use client"

import { EventDto } from "@repo/dto"

interface ResultsCardProps {
	isSearching: boolean
	searchResults: EventDto[]
	selectedEvent: EventDto | null
	onEventSelect: (event: EventDto) => void
	selectedDate: Date
	showOnlyWhenNotOneResult?: boolean // Optional prop to control visibility
}

export default function ResultsCard({
	isSearching,
	searchResults,
	selectedEvent,
	onEventSelect,
	selectedDate,
	showOnlyWhenNotOneResult = true,
}: ResultsCardProps) {
	if (showOnlyWhenNotOneResult && searchResults.length === 1) {
		return null
	}

	return (
		<div className="card bg-base-100 shadow-xl">
			<div className="card-body">
				<h2 className="card-title mb-4">Select Tournament</h2>

				{isSearching ? (
					<div className="flex items-center gap-3">
						<span className="loading loading-spinner loading-md"></span>
						<div>
							<p className="font-medium">Searching for tournaments...</p>
							<p className="text-sm text-base-content/60">Checking Golf Genius API</p>
						</div>
					</div>
				) : searchResults.length === 0 ? (
					<div className="text-center py-8">
						<div className="text-4xl mb-4 text-base-content/30">📅</div>
						<p className="font-medium text-base-content/70 mb-2">No tournaments found</p>
						<p className="text-sm text-base-content/60">
							No events scheduled for {selectedDate.toLocaleDateString()}
						</p>
					</div>
				) : (
					<div className="space-y-4">
						<div className="alert alert-warning">
							<span>{searchResults.length} tournaments found - please select one</span>
						</div>

						<div className="space-y-3">
							{searchResults.map((event) => (
								<div
									key={event.id}
									className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
										selectedEvent?.id === event.id
											? "border-primary bg-primary/5"
											: "border-base-300 hover:border-primary/50"
									}`}
									onClick={() => onEventSelect(event)}
								>
									<h3 className="font-semibold">{event.name}</h3>
									<p className="text-sm text-base-content/70">
										{event.eventType} • {event.registrationType}
									</p>
									<p className="text-sm text-base-content/60">
										{event.startDate}
										{event.startTime && ` at ${event.startTime}`}
									</p>
								</div>
							))}
						</div>

						{selectedEvent && (
							<div className="alert alert-info">
								<span>Selected: {selectedEvent.name}</span>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

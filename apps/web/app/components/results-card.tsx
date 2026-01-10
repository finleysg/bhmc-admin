"use client"

import { getEventTypeName, getRegistrationTypeName } from "@repo/domain/functions"
import { ClubEvent } from "@repo/domain/types"

interface ResultsCardProps {
	isLoading: boolean
	searchResults: ClubEvent[]
	selectedEvent: ClubEvent | null
	onEventSelect: (event: ClubEvent) => void
	selectedDate: Date
}

export default function ResultsCard({
	isLoading,
	searchResults,
	selectedEvent,
	onEventSelect,
	selectedDate,
}: ResultsCardProps) {
	return (
		<div className="card bg-base-100 shadow-xl">
			<div className="card-body">
				<h2 className="card-title mb-4">Select Tournament</h2>

				{isLoading ? (
					<div className="flex items-center gap-3">
						<span className="loading loading-spinner loading-md"></span>
						<div>
							<p className="font-medium">Loading events...</p>
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
						{searchResults.length > 1 && (
							<div className="alert alert-warning">
								<span>{searchResults.length} tournaments found - please select one</span>
							</div>
						)}

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
										{getEventTypeName(event.eventType)} •{" "}
										{getRegistrationTypeName(event.registrationType)}
									</p>
									<p className="text-sm text-base-content/60">
										{event.startDate}
										{event.startTime && ` - ${event.startTime}`}
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

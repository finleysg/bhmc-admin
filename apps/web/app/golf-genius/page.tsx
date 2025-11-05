"use client"

import "react-day-picker/dist/style.css"

import { useEffect, useState } from "react"

import { DayPicker } from "react-day-picker"

import { EventDto } from "@repo/dto"

export default function GolfGeniusPage() {
	const [selectedDate, setSelectedDate] = useState<Date>(new Date())
	const [isSearching, setIsSearching] = useState(false)
	const [searchResults, setSearchResults] = useState<EventDto[]>([])
	const [selectedEvent, setSelectedEvent] = useState<EventDto | null>(null)

	// Auto-search when date changes
	useEffect(() => {
		handleSearch()
	}, [selectedDate])

	const handleDateSelect = (date: Date | undefined) => {
		if (date) {
			setSelectedDate(date)
			setSelectedEvent(null)
		}
	}

	const handleSearch = async () => {
		setIsSearching(true)
		setSearchResults([])
		setSelectedEvent(null)

		try {
			const dateString = selectedDate.toISOString().split("T")[0]
			const response = await fetch(`/api/events/search?date=${dateString}`)

			if (!response.ok) {
				throw new Error(`API request failed: ${response.status}`)
			}

			const events: EventDto[] = await response.json()
			setSearchResults(events)

			// Auto-select if only one event found
			if (events.length === 1) {
				setSelectedEvent(events[0])
			}
		} catch (error) {
			console.error("Search failed:", error)
			setSearchResults([])
		} finally {
			setIsSearching(false)
		}
	}

	const handleEventSelect = (event: EventDto) => {
		setSelectedEvent(event)
	}

	return (
		<main className="min-h-screen p-8 bg-base-200">
			<div className="max-w-6xl mx-auto">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Calendar Card */}
					<div className="card bg-base-100 shadow-xl">
						<div className="card-body">
							<h2 className="card-title mb-4">Select Date</h2>
							<p className="text-sm text-base-content/60 mb-4">
								Choose the tournament date to get started
							</p>

							<DayPicker
								mode="single"
								selected={selectedDate}
								onSelect={handleDateSelect}
								classNames={{
									today: "text-accent",
									day_button: "hover:bg-base-200",
									selected: "bg-primary! text-primary-content!",
									button_next: "hover:bg-primary hover:text-primary-content",
									button_previous: "hover:bg-primary hover:text-primary-content",
									chevron: "fill-primary",
								}}
							/>

							{selectedDate && (
								<div className="mt-4 p-3 bg-base-200 rounded-lg">
									<p className="text-sm font-medium">
										Selected:{" "}
										{selectedDate.toLocaleDateString("en-US", {
											weekday: "long",
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</p>
								</div>
							)}
						</div>
					</div>

					{/* Results Card */}
					<div className="card bg-base-100 shadow-xl">
						<div className="card-body">
							<h2 className="card-title mb-4">Tournament Search</h2>

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
							) : searchResults.length === 1 ? (
								<div className="space-y-4">
									<div className="alert alert-success">
										<span>1 tournament found</span>
									</div>

									<div
										className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
											selectedEvent?.id === searchResults[0].id
												? "border-primary bg-primary/5"
												: "border-base-300 hover:border-primary/50"
										}`}
										onClick={() => handleEventSelect(searchResults[0])}
									>
										<h3 className="font-semibold text-lg">{searchResults[0].name}</h3>
										<p className="text-sm text-base-content/70">
											{searchResults[0].eventType} • {searchResults[0].registrationType}
										</p>
										<p className="text-sm text-base-content/60">
											{searchResults[0].startDate}
											{searchResults[0].startTime && ` at ${searchResults[0].startTime}`}
										</p>
									</div>

									{selectedEvent && (
										<div className="alert alert-info">
											<span>Ready to manage: {selectedEvent.name}</span>
										</div>
									)}
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
												onClick={() => handleEventSelect(event)}
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
				</div>

				{/* Action Footer */}
				{selectedEvent && (
					<div className="mt-8 text-center">
						<div className="alert alert-neutral">
							<span>
								<strong>Next:</strong> Tournament management interface will be implemented here
							</span>
						</div>
					</div>
				)}
			</div>
		</main>
	)
}

"use client"

import { useEffect, useState } from "react"

import { EventDto } from "@repo/dto"

import CalendarCard from "../components/calendar-card"
import ResultsCard from "../components/results-card"
import IntegrationOrchestrator from "./components/integration-orchestrator"

export default function GolfGeniusPage() {
	const [selectedDate, setSelectedDate] = useState<Date>(new Date())
	const [isSearching, setIsSearching] = useState(false)
	const [searchResults, setSearchResults] = useState<EventDto[]>([])
	const [selectedEvent, setSelectedEvent] = useState<EventDto | null>(null)

	// Auto-search when date changes
	useEffect(() => {
		void handleSearch()
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

			const events = (await response.json()) as EventDto[]
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
		<main className="min-h-screen p-0 md:p-8 bg-base-200">
			<div className="max-w-6xl mx-auto">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<CalendarCard selectedDate={selectedDate} onDateSelect={handleDateSelect} />

					<ResultsCard
						isSearching={isSearching}
						searchResults={searchResults}
						selectedEvent={selectedEvent}
						onEventSelect={handleEventSelect}
						selectedDate={selectedDate}
					/>
				</div>

				{/* Integration Orchestrator */}
				{selectedEvent && (
					<div className="mt-8">
						<IntegrationOrchestrator selectedEvent={selectedEvent} />
					</div>
				)}
			</div>
		</main>
	)
}

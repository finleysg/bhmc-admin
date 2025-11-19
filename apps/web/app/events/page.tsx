"use client"

import { useEffect, useState } from "react"

import { useRouter } from "next/navigation"

import { ClubEvent } from "@repo/domain/types"

import { useSession } from "../../lib/auth-client"
import CalendarCard from "../components/calendar-card"
import ResultsCard from "../components/results-card"

export default function EventsPage() {
	const { data: session, isPending } = useSession()
	const signedIn = !!session?.user
	const router = useRouter()

	const [selectedDate, setSelectedDate] = useState<Date>(new Date())
	const [isSearching, setIsSearching] = useState(false)
	const [searchResults, setSearchResults] = useState<ClubEvent[]>([])
	const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null)

	// Redirect if not authenticated
	useEffect(() => {
		if (!signedIn && !isPending) {
			router.push("/sign-in")
		}
	}, [signedIn, isPending, router])

	// Auto-search when date changes
	useEffect(() => {
		if (signedIn) {
			void handleSearch()
		}
	}, [selectedDate, signedIn])

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

			const events = (await response.json()) as ClubEvent[]
			setSearchResults(events)

			// Auto-select if only one event found
			if (events.length === 1) {
				handleEventSelect(events[0])
			}
		} catch (error) {
			console.error("Search failed:", error)
			setSearchResults([])
		} finally {
			setIsSearching(false)
		}
	}

	const handleEventSelect = (event: ClubEvent) => {
		setSelectedEvent(event)
		router.push(`/events/${event.id}`)
	}

	if (isPending) {
		return (
			<div className="flex items-center justify-center p-8">
				<span className="loading loading-spinner loading-lg"></span>
			</div>
		)
	}

	if (!signedIn && !isPending) {
		return null // Redirecting
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
			</div>
		</main>
	)
}

"use client"

import { useEffect, useMemo, useState } from "react"

import { useRouter } from "next/navigation"

import { parseLocalDate } from "@repo/domain/functions"
import { ClubEvent } from "@repo/domain/types"

import { useAuth } from "../../lib/auth-context"
import CalendarCard from "../components/calendar-card"
import ResultsCard from "../components/results-card"

export default function EventsPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const router = useRouter()

	const [selectedDate, setSelectedDate] = useState<Date>(new Date())
	const [currentSeason, setCurrentSeason] = useState<number>(new Date().getFullYear())
	const [seasonEvents, setSeasonEvents] = useState<ClubEvent[]>([])
	const [isLoadingSeason, setIsLoadingSeason] = useState(false)
	const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null)

	// Fetch events when season changes
	useEffect(() => {
		if (signedIn) {
			void fetchSeasonEvents(currentSeason)
		}
	}, [currentSeason, signedIn])

	const fetchSeasonEvents = async (season: number) => {
		setIsLoadingSeason(true)
		try {
			const response = await fetch(`/api/events?season=${season}`)
			if (!response.ok) {
				throw new Error(`API request failed: ${response.status}`)
			}
			const events = (await response.json()) as ClubEvent[]
			setSeasonEvents(events)
		} catch (error) {
			console.error("Failed to fetch season events:", error)
			setSeasonEvents([])
		} finally {
			setIsLoadingSeason(false)
		}
	}

	// Filter events for selected date
	const eventsForDate = useMemo(() => {
		const dateString = selectedDate.toISOString().split("T")[0]
		return seasonEvents.filter((e) => e.startDate === dateString)
	}, [selectedDate, seasonEvents])

	// Compute dates that have events for calendar highlighting
	const eventDates = useMemo(() => {
		return seasonEvents.map((e) => parseLocalDate(e.startDate))
	}, [seasonEvents])

	const handleDateSelect = (date: Date | undefined) => {
		if (date) {
			setSelectedDate(date)
			setSelectedEvent(null)
		}
	}

	const handleMonthChange = (date: Date) => {
		const newSeason = date.getFullYear()
		if (newSeason !== currentSeason) {
			setCurrentSeason(newSeason)
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
					<CalendarCard
						selectedDate={selectedDate}
						onDateSelect={handleDateSelect}
						eventDates={eventDates}
						onMonthChange={handleMonthChange}
					/>

					<ResultsCard
						isLoading={isLoadingSeason}
						searchResults={eventsForDate}
						selectedEvent={selectedEvent}
						onEventSelect={handleEventSelect}
						selectedDate={selectedDate}
					/>
				</div>
			</div>
		</main>
	)
}

"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { isValid, parse } from "date-fns"

import { findEventBySlug } from "../event-utils"
import type { ClubEventDetail } from "../types"

export function useEventFromParams() {
	const params = useParams<{ eventDate: string; eventName: string }>()
	const { eventDate, eventName } = params

	const startDate = eventDate ? parse(eventDate, "yyyy-MM-dd", new Date()) : null
	const year = startDate && isValid(startDate) ? startDate.getFullYear() : null
	const month = startDate && isValid(startDate) ? startDate.getMonth() + 1 : null

	const { data: events, isLoading } = useQuery({
		queryKey: ["events", year, month],
		queryFn: async () => {
			const response = await fetch(`/api/events?year=${year}&month=${month}`)
			if (!response.ok) throw new Error("Failed to fetch events")
			return response.json() as Promise<ClubEventDetail[]>
		},
		enabled: !!year && !!month,
	})

	const event =
		events && eventDate && eventName ? findEventBySlug(events, eventDate, eventName) : undefined

	return { event, isLoading }
}

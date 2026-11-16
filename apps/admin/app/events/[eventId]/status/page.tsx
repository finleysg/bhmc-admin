"use client"

import { useEffect, useState, useCallback } from "react"

import Link from "next/link"
import { useParams } from "next/navigation"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Card, CardBody, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HelperText } from "@/components/ui/helper-text"
import { Button } from "@/components/shadcn/button"
import type { EventStatusInfo } from "@/app/api/events/[id]/status/route"
import { PageLayout } from "@/app/components/ui"
import {
	formatDate,
	formatDateTime,
	getStartTypeLabel,
	getSlotsCreatedVariant,
	getGolfGeniusVariant,
	getDocumentsVariant,
} from "./helpers"

export default function EventStatusPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const params = useParams()
	const eventId = params.eventId as string

	const [statusInfo, setStatusInfo] = useState<EventStatusInfo | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const fetchStatus = useCallback(async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/status`)
			if (!response.ok) {
				throw new Error(`Failed to fetch status: ${response.status}`)
			}
			const data = (await response.json()) as EventStatusInfo
			setStatusInfo(data)
		} catch (err) {
			console.error("Error fetching event status:", err)
			setError("Failed to load event status")
		} finally {
			setLoading(false)
		}
	}, [eventId])

	useEffect(() => {
		if (!signedIn || !eventId) return
		void fetchStatus()
	}, [eventId, signedIn, fetchStatus])

	if (isPending || loading) {
		return (
			<div className="flex items-center justify-center p-8">
				<LoadingSpinner size="lg" />
			</div>
		)
	}

	if (!signedIn) {
		return null
	}

	if (error || !statusInfo) {
		return (
			<div className="text-center p-8">
				<h1 className="text-2xl font-bold mb-4">Error</h1>
				<HelperText className="mb-4">{error || "Event not found"}</HelperText>
			</div>
		)
	}

	const { event, documentsCount, availableSpots, totalSpots } = statusInfo

	return (
		<PageLayout>
			<div className="max-w-3xl mx-auto space-y-4">
				<Card>
					<CardBody>
						<CardTitle>Event Information</CardTitle>
						<div className="space-y-3">
							<div className="flex justify-between">
								<span className="text-base-content/70">Name</span>
								<span className="font-medium">{event.name}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-base-content/70">Start Date</span>
								<span className="font-medium">{formatDate(event.startDate)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-base-content/70">Start Time</span>
								<span className="font-medium">{event.startTime}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-base-content/70">Start Type</span>
								<span className="font-medium">{getStartTypeLabel(event.startType)}</span>
							</div>
							<div className="divider my-2" />
							<div className="flex justify-between">
								<span className="text-base-content/70">Priority Signup</span>
								<span className="font-medium">{formatDateTime(event.prioritySignupStart)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-base-content/70">Signup Start</span>
								<span className="font-medium">{formatDateTime(event.signupStart)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-base-content/70">Signup End</span>
								<span className="font-medium">{formatDateTime(event.signupEnd)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-base-content/70">Payments End</span>
								<span className="font-medium">{formatDateTime(event.paymentsEnd)}</span>
							</div>
							<div className="divider my-2" />
							<div className="flex justify-between">
								<span className="text-base-content/70">Available Spots</span>
								<span className="font-medium">
									{availableSpots} / {totalSpots}
								</span>
							</div>
						</div>
					</CardBody>
				</Card>

				<Card>
					<CardBody>
						<CardTitle>Status</CardTitle>
						<div className="flex flex-wrap gap-2 mb-4">
							{event.canChoose && (
								<Badge variant={getSlotsCreatedVariant(totalSpots)}>Slots Created</Badge>
							)}
							<Badge variant={getGolfGeniusVariant(event.ggId)}>Golf Genius Integration</Badge>
							<Badge variant={getDocumentsVariant(documentsCount)}>Documents Uploaded</Badge>
						</div>
						<div className="divider my-2" />
						<Button asChild size="sm" className="self-start">
							<Link href={`/events/${event.id}/setup`}>Event setup</Link>
						</Button>
					</CardBody>
				</Card>
			</div>
		</PageLayout>
	)
}

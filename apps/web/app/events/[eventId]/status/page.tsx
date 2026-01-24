"use client"

import { useEffect, useState, useCallback } from "react"

import { useParams } from "next/navigation"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Card, CardBody, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HelperText } from "@/components/ui/helper-text"
import { Modal } from "@/components/ui/modal"
import { parseLocalDate } from "@repo/domain/functions"
import { StartTypeChoices } from "@repo/domain/types"

import type { EventStatusInfo } from "@/app/api/events/[id]/status/route"

const START_TYPE_LABELS: Record<string, string> = {
	[StartTypeChoices.TEETIMES]: "Tee Times",
	[StartTypeChoices.SHOTGUN]: "Shotgun",
	[StartTypeChoices.NONE]: "N/A",
}

function formatDate(dateString: string): string {
	const date = parseLocalDate(dateString)
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	})
}

function formatDateTime(dateTimeString: string | null | undefined): string {
	if (!dateTimeString) return "Not set"
	const date = new Date(dateTimeString)
	return date.toLocaleString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	})
}

function formatStartTime(startTime: string | null | undefined): string {
	if (!startTime) return "Not set"
	// startTime is stored as "HH:MM:SS" format
	const [hours, minutes] = startTime.split(":")
	const hour = parseInt(hours, 10)
	const ampm = hour >= 12 ? "PM" : "AM"
	const hour12 = hour % 12 || 12
	return `${hour12}:${minutes} ${ampm}`
}

export default function EventStatusPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const params = useParams()
	const eventId = params.eventId as string

	const [statusInfo, setStatusInfo] = useState<EventStatusInfo | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [showRecreateModal, setShowRecreateModal] = useState(false)
	const [isCreatingSlots, setIsCreatingSlots] = useState(false)

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

	const handleCreateSlots = async () => {
		setIsCreatingSlots(true)
		try {
			const response = await fetch(`/api/registration/${eventId}/create-slots`, {
				method: "POST",
			})
			if (!response.ok) {
				throw new Error(`Failed to create slots: ${response.status}`)
			}
			setShowRecreateModal(false)
			await fetchStatus()
		} catch (err) {
			console.error("Error creating slots:", err)
		} finally {
			setIsCreatingSlots(false)
		}
	}

	const onClickCreateSlots = () => {
		if (statusInfo && statusInfo.totalSpots > 0) {
			setShowRecreateModal(true)
		} else {
			void handleCreateSlots()
		}
	}

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
		<main className="p-4 md:p-8">
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
								<span className="font-medium">{formatStartTime(event.startTime)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-base-content/70">Start Type</span>
								<span className="font-medium">
									{START_TYPE_LABELS[event.startType || ""] || "N/A"}
								</span>
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
						<div className="flex flex-wrap gap-2 mb-4">
							{event.canChoose && (
								<Badge variant={totalSpots > 0 ? "success" : "warning"}>Slots Created</Badge>
							)}
							<Badge variant={event.ggId ? "success" : "warning"}>Golf Genius Integration</Badge>
							<Badge variant={documentsCount > 0 ? "success" : "warning"}>Documents Uploaded</Badge>
						</div>
						{event.canChoose && (
							<div className="flex flex-wrap gap-2">
								<button
									className="btn btn-primary btn-sm"
									onClick={onClickCreateSlots}
									disabled={isCreatingSlots}
								>
									{isCreatingSlots ? (
										<>
											<span className="loading loading-spinner loading-sm"></span>
											Creating...
										</>
									) : totalSpots > 0 ? (
										"Recreate Slots"
									) : (
										"Create Slots"
									)}
								</button>
							</div>
						)}
					</CardBody>
				</Card>

				<Modal
					isOpen={showRecreateModal}
					onClose={() => setShowRecreateModal(false)}
					title="Recreate Slots"
				>
					<p className="py-4">
						Are you sure you want to recreate slots? All existing slots will be deleted and new ones
						will be created. This action cannot be undone.
					</p>
					<div className="modal-action">
						<button
							className="btn btn-ghost"
							onClick={() => setShowRecreateModal(false)}
							disabled={isCreatingSlots}
						>
							Cancel
						</button>
						<button
							className="btn btn-error"
							onClick={() => void handleCreateSlots()}
							disabled={isCreatingSlots}
						>
							{isCreatingSlots ? (
								<>
									<span className="loading loading-spinner loading-sm"></span>
									Recreating...
								</>
							) : (
								"Recreate Slots"
							)}
						</button>
					</div>
				</Modal>
			</div>
		</main>
	)
}

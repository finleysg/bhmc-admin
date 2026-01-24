"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert } from "@/components/ui/alert"
import { Card, CardBody, CardTitle } from "@/components/ui/card"
import {
	EventStatusInfo,
	EventTypeChoices,
	StartTypeChoices,
	ValidationAction,
} from "@repo/domain/types"
import { parseLocalDate } from "@repo/domain/functions"

export default function EventStatusPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const params = useParams()
	const router = useRouter()
	const eventId = params.eventId as string

	const [statusInfo, setStatusInfo] = useState<EventStatusInfo | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [actionLoading, setActionLoading] = useState<string | null>(null)
	const [actionError, setActionError] = useState<string | null>(null)

	const fetchStatus = useCallback(async () => {
		try {
			setLoading(true)
			setError(null)
			const res = await fetch(`/api/events/${eventId}/status`)
			if (!res.ok) {
				throw new Error("Failed to load event status")
			}
			const data = (await res.json()) as EventStatusInfo
			setStatusInfo(data)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load event status")
		} finally {
			setLoading(false)
		}
	}, [eventId])

	useEffect(() => {
		if (!signedIn || !eventId) return
		void fetchStatus()
	}, [signedIn, eventId, fetchStatus])

	const handleAction = async (action: ValidationAction, code: string) => {
		setActionError(null)
		setActionLoading(code)

		try {
			if (action.type === "api-call") {
				if (!action.endpoint || !action.method) {
					throw new Error("Invalid action configuration")
				}

				const res = await fetch(action.endpoint, {
					method: action.method,
				})

				if (!res.ok) {
					const errorData = (await res.json().catch(() => ({}))) as {
						message?: string
					}
					throw new Error(errorData.message ?? `Failed to execute action`)
				}

				// Refresh the page data on success
				await fetchStatus()
			} else if (action.type === "redirect") {
				if (!action.url) {
					throw new Error("Invalid redirect configuration")
				}

				// Django admin URLs should open in new tab
				if (action.url.startsWith("/admin/")) {
					const djangoUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://localhost:8000"
					window.open(`${djangoUrl}${action.url}`, "_blank")
				} else {
					// Internal URLs use router
					router.push(action.url)
				}
			}
		} catch (err) {
			setActionError(err instanceof Error ? err.message : "Action failed")
		} finally {
			setActionLoading(null)
		}
	}

	if (isPending || loading) {
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null
	}

	if (error || !statusInfo) {
		return (
			<main className="min-h-screen flex items-center justify-center p-8">
				<Alert type="error">{error || "Event not found"}</Alert>
			</main>
		)
	}

	const formatDate = (dateString: string | null | undefined) => {
		if (!dateString) return "N/A"
		const date = parseLocalDate(dateString)
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		})
	}

	const formatDateTime = (dateString: string, timeString: string | null | undefined) => {
		const datePart = formatDate(dateString)
		if (!timeString) return datePart
		return `${datePart} at ${timeString}`
	}

	const getEventTypeLabel = (value: string) => {
		const entry = Object.entries(EventTypeChoices).find(([, v]) => v === value)
		return entry
			? entry[0]
					.replace(/_/g, " ")
					.toLowerCase()
					.replace(/\b\w/g, (c) => c.toUpperCase())
			: value
	}

	const getStartTypeLabel = (value: string | null | undefined) => {
		if (!value) return "N/A"
		const entry = Object.entries(StartTypeChoices).find(([, v]) => v === value)
		return entry
			? entry[0]
					.replace(/_/g, " ")
					.toLowerCase()
					.replace(/\b\w/g, (c) => c.toUpperCase())
			: value
	}

	const hasValidations = statusInfo.validations.length > 0
	const isValid = !hasValidations

	return (
		<main className="min-h-screen p-4 md:p-8 bg-base-200">
			<div className="max-w-3xl mx-auto">
				<div className="flex items-center gap-2 mb-6">
					<h1 className="text-2xl font-bold">{statusInfo.event.name}</h1>
					{isValid && <span className="text-green-600 text-2xl">✓</span>}
				</div>

				{statusInfo.isReadonly && (
					<Alert type="info" className="mb-4">
						This event has started. Configuration is read-only.
					</Alert>
				)}

				<Card shadow="sm" className="mb-6">
					<CardBody>
						<CardTitle>Event Information</CardTitle>
						<dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
							<div>
								<dt className="text-sm font-medium text-gray-600">Event Name</dt>
								<dd className="mt-1">{statusInfo.event.name}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-600">Start Date/Time</dt>
								<dd className="mt-1">
									{formatDateTime(statusInfo.event.startDate, statusInfo.event.startTime)}
								</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-600">Event Type</dt>
								<dd className="mt-1">{getEventTypeLabel(statusInfo.event.eventType)}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-600">Start Type</dt>
								<dd className="mt-1">{getStartTypeLabel(statusInfo.event.startType)}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-600">Priority Signup Start</dt>
								<dd className="mt-1">{formatDate(statusInfo.event.prioritySignupStart)}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-600">Signup Start</dt>
								<dd className="mt-1">{formatDate(statusInfo.event.signupStart)}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-600">Signup End</dt>
								<dd className="mt-1">{formatDate(statusInfo.event.signupEnd)}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-600">Payments End</dt>
								<dd className="mt-1">{formatDate(statusInfo.event.paymentsEnd)}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-600">Available Spots</dt>
								<dd className="mt-1">{statusInfo.availableSlotCount}</dd>
							</div>
						</dl>
					</CardBody>
				</Card>

				{actionError && (
					<Alert type="error" className="mb-4">
						{actionError}
					</Alert>
				)}

				{hasValidations && (
					<div className="space-y-4">
						<h2 className="text-xl font-semibold">Validation Results</h2>
						{statusInfo.validations.map((validation, index) => {
							const alertType =
								validation.type === "error"
									? "error"
									: validation.type === "warning"
										? "warning"
										: "info"

							const isActionLoading = actionLoading === validation.code

							return (
								<Alert key={index} type={alertType} className="flex items-center justify-between">
									<span>{validation.message}</span>
									{validation.action && (
										<button
											className="btn btn-sm"
											disabled={statusInfo.isReadonly || isActionLoading}
											onClick={() => {
												void handleAction(validation.action!, validation.code)
											}}
										>
											{isActionLoading ? (
												<span className="loading loading-spinner loading-sm"></span>
											) : (
												validation.action.label
											)}
										</button>
									)}
								</Alert>
							)
						})}
					</div>
				)}
			</div>
		</main>
	)
}

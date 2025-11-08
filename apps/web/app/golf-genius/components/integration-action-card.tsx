"use client"

import { useEffect, useState } from "react"

import { getActionApiPath, supportsStreaming } from "@/lib/integration-actions"
import { IntegrationActionName, IntegrationLogDto, ProgressEventDto } from "@repo/dto"

import IntegrationProgress from "./integration-progress"

interface Props {
	eventId: number
	actionName: IntegrationActionName
	enabled: boolean
	onComplete?: () => void
}

export default function IntegrationActionCard({ eventId, actionName, enabled, onComplete }: Props) {
	const [lastRun, setLastRun] = useState<IntegrationLogDto | null>(null)
	const [isRunning, setIsRunning] = useState(false)
	const [progress, setProgress] = useState<ProgressEventDto | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!enabled) return

		const fetchLogs = async () => {
			try {
				const response = await fetch(
					`/api/golfgenius/events/${eventId}/logs?actionName=${encodeURIComponent(actionName)}`,
				)

				if (!response.ok) {
					throw new Error(`Failed to fetch logs: ${response.status}`)
				}

				const logs = (await response.json()) as IntegrationLogDto[]

				// Find the most recent log entry (regardless of outcome)
				const mostRecentLog = logs.sort(
					(a, b) => new Date(b.actionDate).getTime() - new Date(a.actionDate).getTime(),
				)[0]

				setLastRun(mostRecentLog || null)
			} catch (_error) {
				console.error("Failed to fetch integration logs:", _error)
				setLastRun(null)
			}
		}

		void fetchLogs()
	}, [enabled, eventId, actionName])

	const getStatusBadge = () => {
		if (!lastRun) {
			return <span className="badge badge-neutral text-neutral-content">Not Run</span>
		}

		// Check if the result contains errors, even if marked as successful
		const errorCount = getErrorCount(lastRun.details)

		if (errorCount > 0) {
			return <span className="badge badge-error text-error-content">Error ({errorCount})</span>
		}

		return lastRun.isSuccessful ? (
			<span className="badge badge-success text-success-content">Success</span>
		) : (
			<span className="badge badge-error text-error-content">Failed</span>
		)
	}

	interface ParsedResult {
		errors?: unknown[]
		roundResults?: Array<{
			errors?: unknown[]
		}>
	}

	const getErrorCount = (detailsJson: string | null): number => {
		if (!detailsJson) return 0

		try {
			const result = JSON.parse(detailsJson) as ParsedResult
			let totalErrors = 0

			// Count errors in main errors array
			if (result.errors && Array.isArray(result.errors)) {
				totalErrors += result.errors.length
			}

			// For scores import, also count roundResults errors
			if (result.roundResults && Array.isArray(result.roundResults)) {
				result.roundResults.forEach((round) => {
					if (round.errors && Array.isArray(round.errors)) {
						totalErrors += round.errors.length
					}
				})
			}

			return totalErrors
		} catch {
			return 0
		}
	}

	const formatTimestamp = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		})
	}

	const handleStart = async () => {
		setIsRunning(true)
		setProgress(null)
		setError(null)

		const supportsProgress = supportsStreaming(actionName)

		if (supportsProgress) {
			// Connect to SSE endpoint which will auto-start the import/export
			const eventSource = new EventSource(getActionApiPath(eventId, actionName))

			eventSource.onmessage = (event) => {
				try {
					const progressData = JSON.parse(event.data as string) as ProgressEventDto
					setProgress(progressData)

					if (progressData.status === "complete") {
						setIsRunning(false)
						eventSource.close()
						// Refresh logs after completion
						setTimeout(() => {
							if (onComplete) onComplete()
						}, 1000)
					} else if (progressData.status === "error") {
						setError(progressData.message || "Export failed")
						setIsRunning(false)
						eventSource.close()
					}
				} catch (err: unknown) {
					const errorMessage = err instanceof Error ? err.message : "Failed to parse progress data"
					console.error(errorMessage)
					setError(errorMessage)
					setIsRunning(false)
					eventSource.close()
				}
			}

			eventSource.onerror = () => {
				setError("Connection lost")
				setIsRunning(false)
				eventSource.close()
			}
		} else {
			// Original behavior for non-progress actions
			try {
				const apiPath = getActionApiPath(eventId, actionName)
				const response = await fetch(apiPath, {
					method: "POST",
				})

				if (!response.ok) {
					const errorData = (await response.json()) as { error?: string }
					throw new Error(errorData.error || "Action failed")
				}

				// Success! Notify parent to refresh logs
				if (onComplete) {
					onComplete()
				}
			} catch (err: unknown) {
				const errorMessage = err instanceof Error ? err.message : "Unknown error"
				setError(errorMessage)
				console.error(errorMessage)
			} finally {
				setIsRunning(false)
			}
		}
	}

	return (
		<div className="card bg-base-100 shadow-xl">
			<div className="card-body">
				{/* Header: Action Name + Status Badge */}
				<div className="flex items-center justify-between">
					<h2 className="card-title">{actionName}</h2>
					{getStatusBadge()}
				</div>

				{/* Last Run Info or Progress */}
				{isRunning && progress ? (
					<div className="my-4">
						<IntegrationProgress progress={progress} />
					</div>
				) : (
					<p className="text-sm text-base-content/70">
						Last run: {lastRun ? formatTimestamp(lastRun.actionDate) : "Never"}
					</p>
				)}

				{/* Collapsible Details Section */}
				{lastRun && (
					<div className="collapse collapse-arrow bg-base-200 mt-4">
						<input type="checkbox" />
						<div className="collapse-title text-sm font-medium">View Details</div>
						<div className="collapse-content">
							<pre className="text-xs bg-base-300 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
								{lastRun.details || "No details available"}
							</pre>
						</div>
					</div>
				)}

				{/* Action Button */}
				<div className="card-actions justify-end mt-4">
					<button
						className="btn btn-primary text-primary-content"
						disabled={!enabled || isRunning}
						onClick={() => void handleStart()}
					>
						{isRunning ? (
							<>
								<span className="loading loading-spinner loading-sm"></span>
								Running...
							</>
						) : (
							"Start"
						)}
					</button>
				</div>

				{/* Error Message */}
				{error && (
					<div className="alert alert-error mt-4">
						<span className="text-xs">{error}</span>
					</div>
				)}
			</div>
		</div>
	)
}

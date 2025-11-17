"use client"

import { useEffect, useState } from "react"

import { getActionApiPath, supportsStreaming } from "@/lib/integration-actions"
import {
	IntegrationActionName,
	IntegrationLogDto,
	ProgressEventDto,
	ProgressTournamentDto,
} from "@repo/domain"

import IntegrationProgress from "./integration-progress"

interface ParsedResult {
	errors?: unknown[]
	roundResults?: Array<{
		errors?: unknown[]
	}>
}

interface Props {
	eventId: number
	actionName: IntegrationActionName
	logs: IntegrationLogDto[]
	enabled: boolean
	onComplete?: () => void
}

export default function IntegrationActionCard({
	eventId,
	actionName,
	logs,
	enabled,
	onComplete,
}: Props) {
	const [lastRun, setLastRun] = useState<IntegrationLogDto | null>(null)
	const [isRunning, setIsRunning] = useState(false)
	const [progress, setProgress] = useState<ProgressEventDto | ProgressTournamentDto | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const mostRecentLog = logs.sort(
			(a, b) => new Date(b.actionDate).getTime() - new Date(a.actionDate).getTime(),
		)[0]

		setLastRun(mostRecentLog || null)
	}, [logs])

	const getErrorCount = (detailsJson?: string | null): number => {
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
					const progressData = JSON.parse(event.data as string) as
						| ProgressEventDto
						| ProgressTournamentDto
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

	const errorCount = getErrorCount(lastRun?.details)

	return (
		<>
			<div className="card bg-base-200 shadow-sm">
				<div className="card-body">
					{/* Header: Action Name + Status Badge */}
					<div className="flex items-center justify-between">
						<h2 className="card-title">{actionName}</h2>
					</div>

					{/* Last Run Info, Error, or Progress */}
					<div className="h-24">
						{isRunning && progress ? (
							<div className="my-4">
								<IntegrationProgress progress={progress} />
							</div>
						) : error ? (
							<div className="alert alert-error mt-4">
								<span className="text-xs">{error}</span>
							</div>
						) : (
							<div>
								<p className="text-sm text-base-content/70">
									Last run: {lastRun ? formatTimestamp(lastRun.actionDate) : "Never"}
								</p>
								<p className="text-sm text-base-content/70">
									Last result: {lastRun ? errorCount + " errors" : "N/A"}
									{lastRun && (
										<span className={errorCount === 0 ? "text-success ml-2" : "text-error ml-2"}>
											{errorCount === 0 ? "✓" : "✗"}
										</span>
									)}
								</p>
								<button
									className="link link-secondary text-sm"
									disabled={!lastRun?.details}
									onClick={() =>
										(
											document.getElementById(
												`details-modal-${eventId}-${actionName}`,
											) as HTMLDialogElement
										)?.showModal()
									}
								>
									View details
								</button>
							</div>
						)}
					</div>

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
				</div>
			</div>

			{/* Details Modal */}
			<dialog id={`details-modal-${eventId}-${actionName}`} className="modal">
				<div className="modal-box max-w-4xl">
					<h3 className="font-bold text-lg mb-4">Integration Details</h3>
					<pre className="bg-base-200 p-4 rounded overflow-x-auto text-xs">
						{lastRun?.details
							? JSON.stringify(JSON.parse(lastRun.details), null, 2)
							: "No details available"}
					</pre>
					<div className="modal-action">
						<form method="dialog">
							<button className="btn">Close</button>
						</form>
					</div>
				</div>
				<form method="dialog" className="modal-backdrop">
					<button>close</button>
				</form>
			</dialog>
		</>
	)
}

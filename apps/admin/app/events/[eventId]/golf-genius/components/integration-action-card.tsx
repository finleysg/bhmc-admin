"use client"

import { useEffect, useState } from "react"

import { getActionApiPath, supportsStreaming } from "@/lib/integration-actions"
import {
	IntegrationActionName,
	IntegrationLog,
	PlayerProgressEvent,
	TournamentProgressEvent,
} from "@repo/domain/types"

import { Alert } from "@/components/ui/alert"
import { HelperText } from "@/components/ui/helper-text"
import { Modal } from "@/components/ui/modal"
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
	logs: IntegrationLog[]
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
	const [lastRun, setLastRun] = useState<IntegrationLog | null>(null)
	const [isRunning, setIsRunning] = useState(false)
	const [progress, setProgress] = useState<PlayerProgressEvent | TournamentProgressEvent | null>(
		null,
	)
	const [error, setError] = useState<string | null>(null)
	const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

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
						| PlayerProgressEvent
						| TournamentProgressEvent
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
							<Alert type="error" className="mt-4">
								{error}
							</Alert>
						) : (
							<div>
								<HelperText>
									Last run: {lastRun ? formatTimestamp(lastRun.actionDate) : "Never"}
								</HelperText>
								<HelperText>
									Last result: {lastRun ? errorCount + " errors" : "N/A"}
									{lastRun && (
										<span className={errorCount === 0 ? "text-success ml-2" : "text-error ml-2"}>
											{errorCount === 0 ? "✓" : "✗"}
										</span>
									)}
								</HelperText>
								<button
									className="link link-secondary text-sm"
									disabled={!lastRun?.details}
									onClick={() => setIsDetailsModalOpen(true)}
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
			<Modal
				isOpen={isDetailsModalOpen}
				onClose={() => setIsDetailsModalOpen(false)}
				title="Integration Details"
				className="max-w-4xl"
			>
				<pre className="bg-base-200 p-4 rounded overflow-x-auto text-xs">
					{(() => {
						if (!lastRun?.details) return "No details available"
						try {
							return JSON.stringify(JSON.parse(lastRun.details), null, 2)
						} catch {
							return lastRun.details
						}
					})()}
				</pre>
				<div className="modal-action">
					<button className="btn" onClick={() => setIsDetailsModalOpen(false)}>
						Close
					</button>
				</div>
			</Modal>
		</>
	)
}

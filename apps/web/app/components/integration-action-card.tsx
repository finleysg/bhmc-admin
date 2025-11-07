"use client"

import { useEffect, useState } from "react"

import { getActionApiPath } from "@/lib/integration-actions"
import { IntegrationActionName, IntegrationLogDto } from "@repo/dto"

interface Props {
	eventId: number
	actionName: IntegrationActionName
	enabled: boolean
	onComplete?: () => void
}

export default function IntegrationActionCard({ eventId, actionName, enabled, onComplete }: Props) {
	const [lastRun, setLastRun] = useState<IntegrationLogDto | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [isRunning, setIsRunning] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!enabled) return

		const fetchLogs = async () => {
			setIsLoading(true)
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
			} catch (error) {
				console.error("Failed to fetch integration logs:", error)
				setLastRun(null)
			} finally {
				setIsLoading(false)
			}
		}

		void fetchLogs()
	}, [enabled, eventId, actionName])

	const getStatusBadge = () => {
		if (!lastRun) {
			return <span className="badge badge-neutral">Not Run</span>
		}
		return lastRun.isSuccessful ? (
			<span className="badge badge-success">Success</span>
		) : (
			<span className="badge badge-error">Failed</span>
		)
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
		setError(null)

		try {
			const apiPath = getActionApiPath(eventId, actionName)
			const response = await fetch(apiPath, {
				method: "POST",
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || "Action failed")
			}

			// Success! Notify parent to refresh logs
			if (onComplete) {
				onComplete()
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error"
			setError(errorMessage)
			console.error(`Failed to execute ${actionName}:`, err)
		} finally {
			setIsRunning(false)
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

				{/* Last Run Info */}
				<p className="text-sm text-base-content/70">
					Last run: {lastRun ? formatTimestamp(lastRun.actionDate) : "Never"}
				</p>

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
						className="btn btn-primary"
						disabled={!enabled || isRunning}
						onClick={handleStart}
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

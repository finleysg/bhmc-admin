"use client"

import { useEffect, useState } from "react"

import { IntegrationActionName, IntegrationLogDto } from "@repo/dto"

interface Props {
	eventId: number
	actionName: IntegrationActionName
	enabled: boolean
}

export default function IntegrationActionCard({ eventId, actionName, enabled }: Props) {
	const [lastRun, setLastRun] = useState<IntegrationLogDto | null>(null)
	const [isLoading, setIsLoading] = useState(false)

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

	return (
		<div className="card bg-base-100 shadow-xl">
			<div className="card-body">{/* Empty card for now */}</div>
		</div>
	)
}

"use client"

import { useEffect, useMemo, useState } from "react"

import { EventDto, IntegrationActionName, IntegrationLogDto } from "@repo/dto"

import IntegrationActionCard from "./integration-action-card"

interface PhaseInfo {
	currentPhase: 1 | 2 | 3
	isPhaseComplete: boolean
	canAdvanceToNext: boolean
	nextActionToRun?: IntegrationActionName
}

interface Phase {
	number: 1 | 2 | 3
	title: string
	actions: IntegrationActionName[]
}

const PHASES: Phase[] = [
	{
		number: 1,
		title: "Setup",
		actions: ["Sync Event", "Export Roster"],
	},
	{
		number: 2,
		title: "Import Results",
		actions: ["Import Scores", "Import Points", "Import Results", "Import Skins", "Import Proxies"],
	},
	{
		number: 3,
		title: "Finalize",
		actions: ["Close Event"],
	},
]

function determinePhase(logs: IntegrationLogDto[]): PhaseInfo {
	// Helper: check if action completed successfully
	const hasSuccessfulRun = (action: IntegrationActionName) =>
		logs.some((log) => log.actionName === action && log.isSuccessful)

	// Phase 1: Setup (Sync Event, Export Roster)
	const phase1Complete = hasSuccessfulRun("Sync Event") && hasSuccessfulRun("Export Roster")

	// Phase 2: Import Results (all 5 import actions)
	const phase2Complete =
		hasSuccessfulRun("Import Scores") &&
		hasSuccessfulRun("Import Points") &&
		hasSuccessfulRun("Import Results") &&
		hasSuccessfulRun("Import Skins") &&
		hasSuccessfulRun("Import Proxies")

	// Phase 3: Finalize (Close Event)
	const phase3Complete = hasSuccessfulRun("Close Event")

	// Determine current phase
	if (!phase1Complete) {
		return {
			currentPhase: 1,
			isPhaseComplete: false,
			canAdvanceToNext: false,
			nextActionToRun: !hasSuccessfulRun("Sync Event") ? "Sync Event" : "Export Roster",
		}
	}

	if (!phase2Complete) {
		return {
			currentPhase: 2,
			isPhaseComplete: false,
			canAdvanceToNext: phase1Complete,
			nextActionToRun: getNextImportAction(logs),
		}
	}

	return {
		currentPhase: 3,
		isPhaseComplete: phase3Complete,
		canAdvanceToNext: phase2Complete,
		nextActionToRun: phase3Complete ? undefined : "Close Event",
	}
}

function getNextImportAction(logs: IntegrationLogDto[]): IntegrationActionName | undefined {
	const importOrder: IntegrationActionName[] = [
		"Import Scores",
		"Import Points",
		"Import Results",
		"Import Skins",
		"Import Proxies",
	]

	const hasSuccessfulRun = (action: IntegrationActionName) =>
		logs.some((log) => log.actionName === action && log.isSuccessful)

	// Return first import action that hasn't been run successfully
	for (const action of importOrder) {
		if (!hasSuccessfulRun(action)) {
			return action
		}
	}

	return undefined
}

interface Props {
	selectedEvent: EventDto
}

export default function IntegrationOrchestrator({ selectedEvent }: Props) {
	const [logs, setLogs] = useState<IntegrationLogDto[]>([])
	const [isLoadingLogs, setIsLoadingLogs] = useState(true)
	const [isRefreshing, setIsRefreshing] = useState(false)
	const [phaseOverride, setPhaseOverride] = useState<1 | 2 | 3 | null>(null)

	// Fetch all logs when event changes
	useEffect(() => {
		void fetchLogsForEvent(selectedEvent.id)
	}, [selectedEvent.id])

	const fetchLogsForEvent = async (eventId: number) => {
		setIsLoadingLogs(true)
		try {
			const response = await fetch(`/api/golfgenius/events/${eventId}/logs`)
			if (!response.ok) {
				throw new Error(`Failed to fetch logs: ${response.status}`)
			}
			const allLogs = (await response.json()) as IntegrationLogDto[]
			setLogs(allLogs)
		} catch (error) {
			console.error("Failed to fetch integration logs:", error)
			setLogs([])
		} finally {
			setIsLoadingLogs(false)
		}
	}

	const refreshLogs = async () => {
		setIsRefreshing(true)
		try {
			await fetchLogsForEvent(selectedEvent.id)
		} finally {
			setIsRefreshing(false)
		}
	}

	// Derive phase state from logs
	const phaseInfo = useMemo(() => {
		const derivedPhase = determinePhase(logs)

		if (!phaseOverride) {
			return derivedPhase
		}

		// Helper function for checking successful runs
		const hasSuccessfulRun = (action: IntegrationActionName) =>
			logs.some((log) => log.actionName === action && log.isSuccessful)

		// When overriding phase for navigation, recalculate completion status
		// for the overridden phase
		if (phaseOverride === 1) {
			const phase1Complete = hasSuccessfulRun("Sync Event") && hasSuccessfulRun("Export Roster")
			return {
				currentPhase: 1,
				isPhaseComplete: phase1Complete,
				canAdvanceToNext: phase1Complete, // Can advance if phase 1 is complete
				nextActionToRun: derivedPhase.nextActionToRun,
			}
		}

		if (phaseOverride === 2) {
			const phase2Complete =
				hasSuccessfulRun("Import Scores") &&
				hasSuccessfulRun("Import Points") &&
				hasSuccessfulRun("Import Results") &&
				hasSuccessfulRun("Import Skins") &&
				hasSuccessfulRun("Import Proxies")
			return {
				currentPhase: 2,
				isPhaseComplete: phase2Complete,
				canAdvanceToNext: phase2Complete, // Can advance if phase 2 is complete
				nextActionToRun: derivedPhase.nextActionToRun,
			}
		}

		// Phase 3
		return {
			currentPhase: 3,
			isPhaseComplete: derivedPhase.isPhaseComplete,
			canAdvanceToNext: false, // No phase after 3
			nextActionToRun: derivedPhase.nextActionToRun,
		}
	}, [logs, phaseOverride])

	const currentPhaseConfig = PHASES[phaseInfo.currentPhase - 1]

	const handleNextPhase = () => {
		if (phaseInfo.canAdvanceToNext && phaseInfo.isPhaseComplete) {
			setPhaseOverride((phaseInfo.currentPhase + 1) as 1 | 2 | 3)
		}
	}

	const handlePreviousPhase = () => {
		if (phaseInfo.currentPhase > 1) {
			setPhaseOverride((phaseInfo.currentPhase - 1) as 1 | 2 | 3)
		}
	}

	const handleActionComplete = () => {
		// Refresh logs after action completion
		void refreshLogs()
	}

	if (isLoadingLogs) {
		return (
			<div className="flex items-center justify-center p-8">
				<span className="loading loading-spinner loading-lg"></span>
				<span className="ml-3">Loading integration status...</span>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			{/* Event Header */}
			<EventHeader event={selectedEvent} />

			{/* Phase Progress Indicator */}
			<PhaseProgress
				currentPhase={phaseInfo.currentPhase}
				totalPhases={3}
				isRefreshing={isRefreshing}
			/>

			{/* Current Phase Content */}
			<PhasePanel
				phase={currentPhaseConfig}
				logs={logs}
				isComplete={phaseInfo.isPhaseComplete}
				onActionComplete={handleActionComplete}
				eventId={selectedEvent.id}
			/>

			{/* Navigation */}
			<PhaseNavigation
				canAdvance={phaseInfo.canAdvanceToNext && phaseInfo.isPhaseComplete}
				canGoBack={phaseInfo.currentPhase > 1}
				onNext={handleNextPhase}
				onBack={handlePreviousPhase}
			/>
		</div>
	)
}

function EventHeader({ event }: { event: EventDto }) {
	const formattedDate = new Date(event.startDate).toLocaleDateString("en-US", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})

	return (
		<div className="p-4 bg-info rounded-lg">
			<h2 className="font-bold text-info-content">
				{formattedDate}: {event.name}
			</h2>
		</div>
	)
}

function PhaseProgress({
	currentPhase,
	totalPhases,
	isRefreshing,
}: {
	currentPhase: number
	totalPhases: number
	isRefreshing: boolean
}) {
	return (
		<div className="flex items-center justify-between">
			<div className="text-lg font-semibold">
				Phase {currentPhase} of {totalPhases}
			</div>
			{isRefreshing && (
				<div className="flex items-center text-sm text-base-content/60">
					<span className="loading loading-spinner loading-sm mr-2"></span>
					Refreshing...
				</div>
			)}
		</div>
	)
}

function PhasePanel({
	phase,
	logs,
	isComplete,
	onActionComplete,
	eventId,
}: {
	phase: Phase
	logs: IntegrationLogDto[]
	isComplete: boolean
	onActionComplete: () => void
	eventId: number
}) {
	const hasSuccessfulRun = (action: IntegrationActionName) =>
		logs.some((log) => log.actionName === action && log.isSuccessful)

	return (
		<div className="card bg-base-100 shadow-xl">
			<div className="card-body">
				<div className="flex items-center justify-between mb-4">
					<h3 className="card-title text-info">{phase.title}</h3>
					{isComplete && <span className="badge badge-success text-success-content">Complete</span>}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{phase.actions.map((actionName) => {
						const isEnabled =
							phase.number === 1
								? actionName === "Sync Event" || hasSuccessfulRun("Sync Event")
								: true // Phase 2 and 3 actions are all enabled

						return (
							<IntegrationActionCard
								key={actionName}
								eventId={eventId}
								actionName={actionName}
								enabled={isEnabled}
								onComplete={onActionComplete}
							/>
						)
					})}
				</div>

				{isComplete && (
					<div className="alert alert-success mt-6">
						<span>✅ All tasks in this phase are complete!</span>
					</div>
				)}
			</div>
		</div>
	)
}

function PhaseNavigation({
	canAdvance,
	canGoBack,
	onNext,
	onBack,
}: {
	canAdvance: boolean
	canGoBack: boolean
	onNext: () => void
	onBack: () => void
}) {
	return (
		<div className="flex justify-between">
			<button className="btn btn-outline" disabled={!canGoBack} onClick={onBack}>
				Previous Phase
			</button>

			<button
				className="btn btn-primary text-primary-content"
				disabled={!canAdvance}
				onClick={onNext}
			>
				Next Phase
			</button>
		</div>
	)
}

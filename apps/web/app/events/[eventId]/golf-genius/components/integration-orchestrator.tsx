"use client"

import { useEffect, useMemo, useState } from "react"

import { IntegrationActionName, IntegrationLog, ValidatedClubEvent } from "@repo/domain/types"

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
		title: "Setup Tasks",
		actions: ["Sync Event", "Export Roster"],
	},
	{
		number: 2,
		title: "Import Results",
		actions: ["Import Scores", "Import Points", "Import Results"],
	},
	{
		number: 3,
		title: "Finalize Results",
		actions: ["Import Low Scores", "Import Champions", "Close Event"],
	},
]

function determinePhase(logs: IntegrationLog[]): PhaseInfo {
	// Helper: check if action completed successfully
	const hasSuccessfulRun = (action: IntegrationActionName) =>
		logs.some((log) => log.actionName === action && log.isSuccessful)

	// Phase 1: Setup (Sync Event, Export Roster)
	const phase1Complete = hasSuccessfulRun("Sync Event") && hasSuccessfulRun("Export Roster")

	// Phase 2: Import Results
	const phase2Complete =
		hasSuccessfulRun("Import Scores") &&
		hasSuccessfulRun("Import Points") &&
		hasSuccessfulRun("Import Results")

	// Phase 3: Finalize (Import Low Scores, Import Champions, Close Event)
	const phase3Complete =
		hasSuccessfulRun("Import Low Scores") &&
		hasSuccessfulRun("Import Champions") &&
		hasSuccessfulRun("Close Event")

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
		nextActionToRun: phase3Complete
			? undefined
			: !hasSuccessfulRun("Import Low Scores")
				? "Import Low Scores"
				: !hasSuccessfulRun("Import Champions")
					? "Import Champions"
					: "Close Event",
	}
}

function getNextImportAction(logs: IntegrationLog[]): IntegrationActionName | undefined {
	const importOrder: IntegrationActionName[] = ["Import Scores", "Import Points", "Import Results"]

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
	selectedEvent: ValidatedClubEvent
}

export default function IntegrationOrchestrator({ selectedEvent }: Props) {
	const [logs, setLogs] = useState<IntegrationLog[]>([])
	const [isLoadingLogs, setIsLoadingLogs] = useState(true)
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
			const allLogs = (await response.json()) as IntegrationLog[]
			setLogs(allLogs)
		} catch (error) {
			console.error("Failed to fetch integration logs:", error)
			setLogs([])
		} finally {
			setIsLoadingLogs(false)
		}
	}

	const refreshLogs = async () => {
		await fetchLogsForEvent(selectedEvent.id)
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
				hasSuccessfulRun("Import Results")
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
	}, [logs, phaseOverride, selectedEvent])

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
				canAdvance={phaseInfo.canAdvanceToNext}
				currentPhase={phaseInfo.currentPhase}
				totalPhases={3}
				onNext={handleNextPhase}
				onBack={handlePreviousPhase}
			/>
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
	logs: IntegrationLog[]
	isComplete: boolean
	onActionComplete: () => void
	eventId: number
}) {
	const hasSuccessfulRun = (action: IntegrationActionName) =>
		logs.some((log) => log.actionName === action && log.isSuccessful)

	return (
		<div className="card bg-base-100 shadow-sm">
			<div className="card-body">
				<h3 className="card-title">
					{phase.title}
					{isComplete && <span className="badge badge-success text-success-content">Done</span>}
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{phase.actions.map((actionName) => {
						// For team events, replace "Import Results" with "Import Team Results"
						const actualActionName = actionName

						const isEnabled =
							phase.number === 1
								? actualActionName === "Sync Event" || hasSuccessfulRun("Sync Event")
								: true // Phase 2 and 3 actions are all enabled
						const phaseLogs = logs.filter((l) => l.actionName === actualActionName)
						return (
							<IntegrationActionCard
								key={actualActionName}
								eventId={eventId}
								actionName={actualActionName}
								logs={phaseLogs}
								enabled={isEnabled}
								onComplete={onActionComplete}
							/>
						)
					})}
				</div>
			</div>
		</div>
	)
}

function PhaseNavigation({
	canAdvance,
	currentPhase,
	totalPhases,
	onNext,
	onBack,
}: {
	canAdvance: boolean
	currentPhase: number
	totalPhases: number
	onNext: () => void
	onBack: () => void
}) {
	return (
		<div className="grid grid-cols-3 items-center">
			<div>
				{currentPhase > 1 && (
					<button className="btn btn-outline" onClick={onBack}>
						Previous
					</button>
				)}
			</div>
			<div className="text-center">
				{currentPhase} of {totalPhases}
			</div>
			<div className="flex justify-end">
				{currentPhase < totalPhases && (
					<button
						className="btn btn-primary text-primary-content"
						disabled={!canAdvance}
						onClick={onNext}
					>
						Next
					</button>
				)}
			</div>
		</div>
	)
}

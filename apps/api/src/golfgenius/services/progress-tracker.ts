import { Subject } from "rxjs"

import { Injectable, Logger, Optional } from "@nestjs/common"
import { IntegrationActionName, ProgressEventDto, ProgressTournamentDto } from "@repo/domain/types"

import { IntegrationLogService } from "./integration-log.service"
import {
	DEFAULT_TRACKER_CONFIG,
	ExportResult,
	ImportResult,
	OperationResult,
	TrackerConfig,
} from "./progress-tracker.types"

@Injectable()
export class ProgressTracker {
	private readonly logger = new Logger(ProgressTracker.name)

	private readonly activeOperations = new Map<
		number,
		Subject<ProgressEventDto | ProgressTournamentDto>
	>()
	private readonly operationResults = new Map<number, OperationResult>()
	private readonly config: TrackerConfig

	constructor(
		private readonly integrationLog: IntegrationLogService,
		@Optional() config?: Partial<TrackerConfig>,
	) {
		this.config = { ...DEFAULT_TRACKER_CONFIG, ...config }
	}

	/**
	 * Start tracking a new export and return the progress observable
	 */
	startTracking(
		eventId: number,
		totalPlayers: number,
	): Subject<ProgressEventDto | ProgressTournamentDto> {
		// Check if operation is already running
		if (this.activeOperations.has(eventId)) {
			throw new Error(`Operation already in progress for event ${eventId}`)
		}

		const subject = new Subject<ProgressEventDto | ProgressTournamentDto>()
		this.activeOperations.set(eventId, subject)

		// Auto-cleanup after configured timeout
		setTimeout(() => {
			this.cleanupOperation(eventId)
		}, this.config.progressCleanupMs)

		this.emitProgress(eventId, {
			totalPlayers,
			processedPlayers: 0,
			status: "processing",
			message: "Starting export...",
		})

		return subject
	}

	startTournamentTracking(
		eventId: number,
		totalTournaments: number,
	): Subject<ProgressEventDto | ProgressTournamentDto> {
		// Check if operation is already running
		if (this.activeOperations.has(eventId)) {
			throw new Error(`Operation already in progress for event ${eventId}`)
		}

		const subject = new Subject<ProgressEventDto | ProgressTournamentDto>()
		this.activeOperations.set(eventId, subject)

		// Auto-cleanup after configured timeout
		setTimeout(() => {
			this.cleanupOperation(eventId)
		}, this.config.progressCleanupMs)

		// Emit initial tournament-based progress
		this.emitTournamentProgress(eventId, {
			totalTournaments,
			processedTournaments: 0,
			status: "processing",
			message: "Starting import...",
		})

		return subject
	}

	/**
	 * Get the progress observable for an active operation
	 */
	getProgressObservable(eventId: number): Subject<ProgressEventDto | ProgressTournamentDto> | null {
		return this.activeOperations.get(eventId) ?? null
	}

	/**
	 * Emit a progress update for an active operation
	 */
	emitProgress(eventId: number, progress: ProgressEventDto | ProgressTournamentDto): void {
		const subject = this.activeOperations.get(eventId)
		if (subject) {
			subject.next(progress)
		}
	}

	/**
	 * Emit a tournament progress update for an active operation
	 */
	emitTournamentProgress(eventId: number, progress: ProgressTournamentDto): void {
		this.emitProgress(eventId, progress)
	}

	/**
	 * Mark an export as complete and log success
	 */
	async completeExport(eventId: number, result: ExportResult): Promise<void> {
		this.setResult(eventId, result)

		this.emitProgress(eventId, {
			totalPlayers: result.totalPlayers,
			processedPlayers: result.totalPlayers,
			status: "complete",
			message: "Export complete",
		})

		// Log successful export completion
		await this.integrationLog
			.createLogEntry({
				actionName: "Export Roster",
				actionDate: new Date().toISOString(),
				details: JSON.stringify(result, null, 2),
				eventId,
				isSuccessful: true,
			})
			.catch((error: unknown) => {
				this.logger.error("Failed to log successful roster export", {
					eventId,
					error: String(error),
				})
			})

		// Cleanup after a short delay to allow final event to be sent
		setTimeout(() => {
			this.cleanupOperation(eventId)
		}, 1000)
	}

	/**
	 * Mark an export as failed and log error
	 */
	async errorExport(eventId: number, error: string, result?: Partial<ExportResult>): Promise<void> {
		const totalPlayers = result?.totalPlayers ?? 0

		this.emitProgress(eventId, {
			totalPlayers,
			processedPlayers: 0,
			status: "error",
			message: error,
		})

		// Store error result if provided
		if (result) {
			this.setResult(eventId, result as ExportResult)
		}

		// Log failed export
		const exportResult = this.getResult(eventId)
		await this.integrationLog
			.createLogEntry({
				actionName: "Export Roster",
				actionDate: new Date().toISOString(),
				details: JSON.stringify(
					{
						error,
						result: exportResult,
					},
					null,
					2,
				),
				eventId,
				isSuccessful: false,
			})
			.catch((logError: unknown) => {
				this.logger.error("Failed to log failed roster export", {
					eventId,
					logError: String(logError),
				})
			})

		// Cleanup after a short delay
		setTimeout(() => {
			this.cleanupOperation(eventId)
		}, 1000)
	}

	/**
	 * Mark an operation as complete and log success
	 */
	async completeOperation(eventId: number, result: OperationResult): Promise<void> {
		this.setResult(eventId, result)

		// Determine progress values based on result type
		const isImport = "actionName" in result && "totalProcessed" in result
		const totalPlayers = isImport ? result.totalProcessed : result.totalPlayers
		const actionName = isImport ? result.actionName : "Export Roster"

		this.emitProgress(eventId, {
			totalPlayers,
			processedPlayers: totalPlayers,
			status: "complete",
			message: `${actionName} complete`,
		})

		// Log successful operation completion
		await this.integrationLog
			.createLogEntry({
				actionName: actionName as IntegrationActionName,
				actionDate: new Date().toISOString(),
				details: JSON.stringify(result, null, 2),
				eventId,
				isSuccessful: true,
			})
			.catch((error: unknown) => {
				this.logger.error(`Failed to log successful ${actionName}`, {
					eventId,
					error: String(error),
				})
			})

		// Cleanup after a short delay to allow final event to be sent
		setTimeout(() => {
			this.cleanupOperation(eventId)
		}, 1000)
	}

	/**
	 * Mark an operation as failed and log error
	 */
	async errorOperation(
		eventId: number,
		actionName: IntegrationActionName,
		error: string,
		result?: Partial<OperationResult>,
	): Promise<void> {
		// Determine total players based on result type
		const isImportResult = result && "totalProcessed" in result
		const totalPlayers = isImportResult
			? ((result as ImportResult).totalProcessed ?? 0)
			: ((result as ExportResult)?.totalPlayers ?? 0)

		this.emitProgress(eventId, {
			totalPlayers,
			processedPlayers: 0,
			status: "error",
			message: error,
		})

		// Store error result if provided
		if (result) {
			this.setResult(eventId, result as OperationResult)
		}

		// Log failed operation
		const operationResult = this.getResult(eventId)
		await this.integrationLog
			.createLogEntry({
				actionName,
				actionDate: new Date().toISOString(),
				details: JSON.stringify(
					{
						error,
						result: operationResult,
					},
					null,
					2,
				),
				eventId,
				isSuccessful: false,
			})
			.catch((logError: unknown) => {
				this.logger.error(`Failed to log failed ${actionName}`, {
					eventId,
					logError: String(logError),
				})
			})

		// Cleanup after a short delay
		setTimeout(() => {
			this.cleanupOperation(eventId)
		}, 1000)
	}

	/**
	 * Store an operation result
	 */
	setResult(eventId: number, result: OperationResult): void {
		this.operationResults.set(eventId, result)

		// Auto-cleanup result after configured timeout
		setTimeout(() => {
			this.operationResults.delete(eventId)
		}, this.config.resultCleanupMs)
	}

	/**
	 * Get a stored operation result
	 */
	getResult(eventId: number): OperationResult | null {
		return this.operationResults.get(eventId) ?? null
	}

	/**
	 * Check if an operation is currently active
	 */
	isOperationActive(eventId: number): boolean {
		return this.activeOperations.has(eventId)
	}

	/**
	 * Clean up resources for an operation
	 */
	private cleanupOperation(eventId: number): void {
		const subject = this.activeOperations.get(eventId)
		if (subject) {
			subject.complete()
			this.activeOperations.delete(eventId)
		}
	}

	/**
	 * Get current status of all active operations (for debugging/monitoring)
	 */
	getActiveOperations(): number[] {
		return Array.from(this.activeOperations.keys())
	}

	/**
	 * Force cleanup of all operations (for testing/shutdown)
	 */
	cleanupAll(): void {
		for (const eventId of this.activeOperations.keys()) {
			this.cleanupOperation(eventId)
		}
		this.operationResults.clear()
	}
}

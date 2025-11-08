/**
 * Type definitions for progress tracking (export and import operations)
 */

export interface ExportResult {
	eventId: number
	totalPlayers: number
	created: number
	updated: number
	skipped: number
	errors: ExportError[]
}

export interface ExportError {
	slotId?: number
	playerId?: number
	email?: string
	error: string
}

export interface ImportResult {
	eventId: number
	actionName: string
	totalProcessed: number
	created: number
	updated: number
	skipped: number
	errors: ImportError[]
}

export interface ImportError {
	itemId?: string
	itemName?: string
	error: string
}

export type OperationResult = ExportResult | ImportResult

export interface TrackerConfig {
	progressCleanupMs: number // How long to keep progress subjects alive (default: 5 minutes)
	resultCleanupMs: number // How long to keep results in memory (default: 10 minutes)
}

export const DEFAULT_TRACKER_CONFIG: TrackerConfig = {
	progressCleanupMs: 5 * 60 * 1000, // 5 minutes
	resultCleanupMs: 10 * 60 * 1000, // 10 minutes
}

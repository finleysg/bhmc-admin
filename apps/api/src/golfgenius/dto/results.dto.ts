/**
 * Result types for Golf Genius integration operations
 */

import { ExportError, ImportError } from "./errors.dto"

export interface ExportResult {
	eventId: number
	totalPlayers: number
	created: number
	updated: number
	skipped: number
	errors: ExportError[]
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

export interface ImportResultSummary {
	tournamentId: number
	tournamentName: string
	eventName: string
	resultsImported: number
	skippedBlinds?: number
	errors: string[]
}

export type OperationResult = ExportResult | ImportResult

export interface UnmatchedPlayer {
	id?: number
	name?: string
	ghin?: string | null
}

export interface MemberSyncResult {
	total_players: number
	updated_players: number
	errors: ImportError[]
	unmatched: UnmatchedPlayer[]
}

export interface ImportEventScoresResult {
	eventId: number
	totalScores: number
	created: number
	updated: number
	skipped: number
	errors: ImportError[]
}

export interface TrackerConfig {
	progressCleanupMs: number // How long to keep progress subjects alive (default: 5 minutes)
	resultCleanupMs: number // How long to keep results in memory (default: 10 minutes)
}

export const DEFAULT_TRACKER_CONFIG: TrackerConfig = {
	progressCleanupMs: 5 * 60 * 1000, // 5 minutes
	resultCleanupMs: 10 * 60 * 1000, // 10 minutes
}

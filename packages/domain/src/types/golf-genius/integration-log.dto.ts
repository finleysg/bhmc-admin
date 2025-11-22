/**
 * Shared DTOs for Golf Genius integration logging
 */

/**
 * Allowed action names for integration logging
 */
export type IntegrationActionName =
	| "Sync Event"
	| "Export Roster"
	| "Import Scores"
	| "Import Points"
	| "Import Results"
	| "Import Low Scores"
	| "Close Event"

/**
 * DTO for integration log entries (shared between API and web app)
 */
export interface IntegrationLogDto {
	id: number
	actionName: IntegrationActionName
	actionDate: string
	details: string | null
	eventId: number
	isSuccessful: boolean
}

import { IntegrationActionName } from "@repo/domain/types"

/**
 * Maps IntegrationActionName to backend endpoint paths
 * All endpoints are on the golfgenius controller
 */
export const INTEGRATION_ACTION_ENDPOINTS: Record<IntegrationActionName, string> = {
	"Sync Event": "sync-event",
	"Export Roster": "export-roster",
	"Import Scores": "import-scores",
	"Import Points": "import-points",
	"Import Results": "import-results",
	"Close Event": "close-event",
}

/**
 * Actions that support real-time streaming progress updates
 */
export const STREAMING_ACTIONS: Set<IntegrationActionName> = new Set([
	"Export Roster",
	"Import Scores",
	"Import Points",
	"Import Results",
])

/**
 * Checks if an integration action supports streaming progress updates
 */
export function supportsStreaming(actionName: IntegrationActionName): boolean {
	return STREAMING_ACTIONS.has(actionName)
}

/**
 * Generates the full API proxy path for an integration action
 */
export function getActionApiPath(eventId: number, actionName: IntegrationActionName): string {
	const endpoint = INTEGRATION_ACTION_ENDPOINTS[actionName]
	return `/api/golfgenius/events/${eventId}/${endpoint}`
}

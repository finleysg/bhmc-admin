/**
 * Domain types for events start logic.
 * Pure, deterministic data shapes used by domain functions.
 */

/**
 * Event domain data required by getStart.
 * Field names match the database/service layer naming (camelCase).
 */
export interface EventDomainData {
	id?: number
	eventType: string // e.g., "N"
	startType?: string | null // "TT" | "SG" | null
	startTime?: string | null // e.g., "5:00 PM"
	teeTimeSplits?: string | null // e.g., "9" or "8,9"
	starterTimeInterval: number // every Nth slot is skipped (0 means no skipping)
	teamSize?: number
	canChoose?: boolean | number
}

/**
 * Registration slot domain data required by getStart.
 * - slot is 0-based index
 * - startingOrder is 0 or 1
 * - holeId is optional (required for SG)
 */
export interface RegistrationSlotDomainData {
	id?: number
	slot: number
	startingOrder: number
	holeId?: number | null
	registrationId?: number | null
	courseId?: number | null
}

/**
 * Course domain data used for group labels.
 */
export interface CourseDomainData {
	id: number
	name: string
}

/**
 * Hole domain data used for shotgun calculations.
 */
export interface HoleDomainData {
	id: number
	holeNumber: number
	courseId?: number
}

/**
 * Result of getStart:
 * - "N/A" for not-applicable
 * - Time string in "H:MM AM|PM" format for tee times
 * - Hole+Order string like "8B" for shotgun
 */
export type StartResult = string

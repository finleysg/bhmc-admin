import { ClubEvent, CompleteClubEvent } from "../types"

/**
 * Validates a ClubEvent with optional GolfGenius exclusion.
 * @param event The ClubEvent to validate
 * @param excludeGolfGenius When true, skips validation for GolfGenius-related fields (ggId, eventRounds, tournaments)
 * @returns CompleteClubEvent if default validation passes, original ClubEvent if excludeGolfGenius=true and passes, null if validation fails
 */
export function validateClubEvent(
	event: ClubEvent,
	excludeGolfGenius = false,
): CompleteClubEvent | ClubEvent | null {
	const hasValidFees =
		event.eventFees &&
		event.eventFees.length > 0 &&
		event.eventFees.some((fee) => fee.feeType !== undefined && fee.feeType !== null)

	if (!hasValidFees) {
		return null
	}

	const hasValidCourses = !event.canChoose || (event.courses && event.courses.length > 0)

	if (!hasValidCourses) {
		return null
	}

	if (excludeGolfGenius) {
		return event
	}

	// Default validation: require GolfGenius fields
	if (!event.ggId) {
		return null
	}

	if (!event.eventRounds || event.eventRounds.length === 0) {
		return null
	}

	if (!event.tournaments || event.tournaments.length === 0) {
		return null
	}

	// All validations passed, return narrowed type
	return event as CompleteClubEvent
}

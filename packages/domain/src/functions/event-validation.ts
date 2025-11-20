import { ClubEvent } from "../types"
import { ValidatedClubEvent } from "../types/events/validated-types"
import { validateCourses } from "./course-validation"

// Helper validation functions
const hasValidIdsInEventFees = (fees: ClubEvent["eventFees"]): boolean =>
	fees != null && fees.every((fee) => fee.id != null && fee.feeType && fee.feeType.id != null)

const hasValidIdsAndGgIdsInRounds = (rounds: ClubEvent["eventRounds"]): boolean =>
	rounds != null && rounds.every((round) => round.id != null && round.ggId != null)

const hasValidIdsAndGgIdsInTournaments = (tournaments: ClubEvent["tournaments"]): boolean =>
	tournaments != null &&
	tournaments.every((tournament) => tournament.id != null && tournament.ggId != null)

/**
 * Validates a ClubEvent ensuring all fields, including GolfGenius-related ones, are present and valid.
 * @param event The ClubEvent to validate
 * @returns ValidatedClubEvent if validation passes, null otherwise
 */
export function validateClubEvent(event: ClubEvent): ValidatedClubEvent | null {
	const hasValidFees =
		event.eventFees &&
		event.eventFees.length > 0 &&
		event.eventFees.some((fee) => fee.feeType != null && fee.feeType?.id !== undefined)

	if (!hasValidFees) {
		return null
	}

	if (event.canChoose) {
		const hasCourses = event.courses && event.courses.length > 0
		if (!hasCourses || !validateCourses(event.courses!)) {
			return null
		}
	}

	// Validate that all objects in collections have required ids
	if (!hasValidIdsInEventFees(event.eventFees)) {
		return null
	}

	// Default validation: require GolfGenius fields
	if (!event.ggId) {
		return null
	}

	if (!event.id) {
		return null
	}

	if (!event.eventRounds || event.eventRounds.length === 0) {
		return null
	}

	if (!event.tournaments || event.tournaments.length === 0) {
		return null
	}

	// Validate that all GolfGenius objects have required ids and ggIds
	if (!hasValidIdsAndGgIdsInRounds(event.eventRounds)) {
		return null
	}

	if (!hasValidIdsAndGgIdsInTournaments(event.tournaments)) {
		return null
	}

	// All validations passed, return narrowed type
	return event as ValidatedClubEvent
}

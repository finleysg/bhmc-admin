import { ClubEvent } from "../types"
import { ValidatedClubEvent } from "../types/events/validated-types"

// Helper validation functions
const hasValidIdsInEventFees = (fees: ClubEvent["eventFees"]): boolean =>
	fees != null && fees.every((fee) => fee.id != null && fee.feeType && fee.feeType.id != null)

const hasValidIdsInCourses = (courses: ClubEvent["courses"]): boolean =>
	courses != null
		? courses.every(
				(course) =>
					course.id != null &&
					course.holes != null &&
					course.holes.length > 0 &&
					course.holes.every((h) => h.id != null) &&
					course.tees != null &&
					course.tees.length > 0 &&
					course.tees.every((t) => t.id != null),
			)
		: true

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
		event.eventFees.some((fee) => fee.feeType !== undefined && fee.feeType !== null)

	if (!hasValidFees) {
		return null
	}

	const hasValidCourses = !event.canChoose || (event.courses && event.courses.length > 0)

	if (!hasValidCourses) {
		return null
	}

	// Validate that all objects in collections have required ids
	if (!hasValidIdsInEventFees(event.eventFees)) {
		return null
	}

	if (event.courses && !hasValidIdsInCourses(event.courses)) {
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

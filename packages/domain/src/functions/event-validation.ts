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
 * @returns ValidatedClubEvent if validation passes, throws Error otherwise
 * @throws Error with concatenated validation issues if validation fails
 */
export function validateClubEvent(
	event: ClubEvent,
	requireIntegration: boolean | undefined = true,
): ValidatedClubEvent {
	const issues: string[] = []
	const hasValidFees =
		event.eventFees &&
		event.eventFees.length > 0 &&
		event.eventFees.some((fee) => fee.feeType != null && fee.feeType?.id !== undefined)

	if (!hasValidFees) {
		issues.push("The eventFees collection is incomplete.")
	}

	if (event.canChoose) {
		const hasCourses = event.courses && event.courses.length > 0
		if (!hasCourses || !validateCourses(event.courses!)) {
			issues.push("The course information is incomplete.")
		}
	}

	// Validate that all objects in collections have required ids
	if (!hasValidIdsInEventFees(event.eventFees)) {
		issues.push("One or more ids are missing in the eventFees collection.")
	}

	// Default validation: require GolfGenius fields
	if (requireIntegration && !event.ggId) {
		issues.push("The event is missing the Golf Genius id - run Event Sync!")
	}

	if (!event.id) {
		issues.push("The event is missing its id (PK).")
	}

	if (requireIntegration && (!event.eventRounds || event.eventRounds.length === 0)) {
		issues.push("The event is missing the rounds from Golf Genius - run Event Sync!")
	}

	if (requireIntegration && (!event.tournaments || event.tournaments.length === 0)) {
		issues.push("The event is missing the tournaments from Golf Genius - run Event Sync!")
	}

	// Validate that all GolfGenius objects have required ids and ggIds
	if (requireIntegration && !hasValidIdsAndGgIdsInRounds(event.eventRounds)) {
		issues.push("The rounds from Golf Genius are missing ids - run Event Sync!")
	}

	if (requireIntegration && !hasValidIdsAndGgIdsInTournaments(event.tournaments)) {
		issues.push("The tournaments from Golf Genius are missing ids - run Event Sync!")
	}

	if (issues.length > 0) {
		throw new Error(issues.join("\n"))
	}

	// All validations passed, return narrowed type
	return event as ValidatedClubEvent
}

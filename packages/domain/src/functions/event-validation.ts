import { ClubEvent } from "../types"
import { CompleteClubEvent } from "../types/events/validated-types"
import { validateCourses } from "./course-validation"

// Helper validation functions
const hasValidIdsInEventFees = (fees: ClubEvent["eventFees"]): boolean =>
	fees != null && fees.every((fee) => fee.id != null && fee.feeType && fee.feeType.id != null)

/**
 * Validates a ClubEvent ensuring all fields, including GolfGenius-related ones, are present and valid.
 * @param event The ClubEvent to validate
 * @returns CompleteClubEvent if validation passes, throws Error otherwise
 * @throws Error with concatenated validation issues if validation fails
 */
export function validateClubEvent(
	event: ClubEvent,
	requireIntegration: boolean | undefined = true,
): CompleteClubEvent {
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
	} else {
		event.courses = [] // ensure we can always iterate courses
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

	if (issues.length > 0) {
		throw new Error(issues.join("\n"))
	}

	// All validations passed, return narrowed type
	return event as CompleteClubEvent
}

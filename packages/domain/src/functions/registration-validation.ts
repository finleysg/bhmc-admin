import { RegistrationSlot } from "../types"
import { RegisteredPlayer } from "../types/register/registered-player"
import { Registration } from "../types/register/registration"
import { RegistrationFee } from "../types/register/registration-fee"
import { ValidatedRegisteredPlayer, ValidatedRegistration } from "../types/register/validated-types"

// Helper validation functions
const hasValidFees = (fees: RegistrationFee[] | undefined): boolean => {
	return (
		fees != null &&
		fees.every((fee) => fee.id != null) &&
		fees.every(
			(fee) =>
				fee.eventFee != null &&
				fee.eventFee?.id != null &&
				fee.eventFee?.feeType != null &&
				fee.eventFee?.feeType?.id != null,
		)
	)
}

const hasValidSlots = (
	slots: RegistrationSlot[] | undefined,
	hasCourseDetails: boolean,
): boolean => {
	if (!slots || slots.length === 0) return false
	return slots.every((slot) => {
		if (slot.id == null) {
			return false
		}
		if (hasCourseDetails) {
			if (slot.holeId == null || !slot.hole || slot.hole.id == null) {
				return false
			}
		}
if (slot.player != null && !slot.player.id) {
return false
}
if (slot.fees != null && !hasValidFees(slot.fees)) {
return false
}
return true
	})
}

/**
 * Validate a Registration's required fields and nested data.
 *
 * @param registration - The Registration to validate
 * @returns The validated registration as a `ValidatedRegistration`
 * @throws Error - If validation fails; the error message begins with the registration id (when available) and lists all validation issues on separate lines.
 */
export function validateRegistration(registration: Registration): ValidatedRegistration | null {
	const issues: string[] = []

	if (!registration?.id) {
		issues.push("The registration ID is missing.")
	}

	const hasCourseDetails = !!registration?.courseId

	if (!hasValidSlots(registration.slots, hasCourseDetails)) {
		issues.push("The registration slots are invalid or missing.")
	}

	// Only require minimal courrse information
	if (hasCourseDetails && (!registration.course || !registration.course?.id)) {
		issues.push("The course information is invalid or missing.")
	}

	if (issues.length > 0) {
		throw new Error(`Validation failed for registration ${registration?.id}: ` + issues.join("\n"))
	}

	// All validations passed, return narrowed type
	return registration as ValidatedRegistration
}

/**
 * Validates a RegisteredPlayer ensuring all core fields are present and valid.
 * When hasCourseDetails is false, course can be undefined/null.
 * @param registeredPlayer The RegisteredPlayer to validate
 * @param hasCourseDetails Whether to require course details (default: true)
 * @returns ValidatedRegisteredPlayer if validation passes, null otherwise
 */
export function validateRegisteredPlayer(
	registeredPlayer: RegisteredPlayer,
): ValidatedRegisteredPlayer {
	const issues: string[] = []

	if (!registeredPlayer) {
		issues.push("No registered player object provided.")
	}

	// Validate core required fields
	if (!registeredPlayer.slot?.id) {
		issues.push("The slot object is missing.")
	}

	if (!registeredPlayer.player?.id) {
		issues.push("The player object is missing.")
	}

	if (!registeredPlayer.registration?.id) {
		issues.push("The registration object is missing.")
	}

	const hasCourseDetails = !!registeredPlayer.registration?.courseId

	// Validate course and hole if details are required (canChoose event)
	if (hasCourseDetails) {
		if (!registeredPlayer.course || !registeredPlayer.course?.id) {
			issues.push("The course information is incomplete.")
		}
		if (!registeredPlayer.hole || !registeredPlayer.hole?.id) {
			issues.push("The starting hole information is incomplete.")
		}
	}

	// Validate fees if present (undefined is acceptable, but empty arrays and invalid fees are invalid)
	if (registeredPlayer.fees != null) {
		if (registeredPlayer.fees.length === 0 || !hasValidFees(registeredPlayer.fees)) {
			issues.push("The registration fee collection is incomplete.")
		}
	}

	if (issues.length > 0) {
		throw new Error(
			`Validation failed for player ${registeredPlayer?.player?.email}: ` + issues.join("\n"),
		)
	}

	// All validations passed, return narrowed type
	return registeredPlayer as ValidatedRegisteredPlayer
}
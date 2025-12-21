import { RegistrationSlot } from "../types"
import { Registration } from "../types/register/registration"
import { RegistrationFee } from "../types/register/registration-fee"
import { ValidatedRegistration } from "../types/register/validated-types"

// Helper validation functions
const hasValidFees = (fees: RegistrationFee[] | undefined): boolean => {
	return (
		fees != null &&
		fees.length > 0 &&
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
		} else {
			// dummy
			slot.hole = {
				id: -1,
				courseId: -1,
				holeNumber: -1,
				par: -1,
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
export function validateRegistration(registration: Registration): ValidatedRegistration {
	const issues: string[] = []

	if (!registration?.id) {
		issues.push("The registration ID is missing.")
	}

	const hasCourseDetails = !!registration?.courseId

	if (!hasValidSlots(registration.slots, hasCourseDetails)) {
		issues.push("The registration slots are invalid or missing.")
	}

	// Only require minimal course information
	if (hasCourseDetails && (!registration.course || !registration.course?.id)) {
		issues.push("The course information is invalid or missing.")
	}

	if (!hasCourseDetails) {
		// dummy
		registration.course = {
			id: -1,
			name: "dummy",
			numberOfHoles: 0,
			holes: [],
		}
	}

	if (issues.length > 0) {
		throw new Error(`Validation failed for registration ${registration?.id}: ` + issues.join("\n"))
	}

	// All validations passed, return narrowed type
	return registration as ValidatedRegistration
}

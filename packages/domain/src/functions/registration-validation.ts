import { RegistrationSlot } from "../types"
import { Registration } from "../types/register/registration"
import { RegistrationFee } from "../types/register/registration-fee"
import { ValidatedRegistration } from "../types/register/validated-types"
import { validateCourse } from "./course-validation"

// Helper validation functions
const hasValidFees = (fees: RegistrationFee[] | undefined): boolean => {
	return (
		fees != null &&
		fees.every((fee) => fee.id != null) &&
		fees.every(
			(fee) =>
				fee.eventFee !== null &&
				fee.eventFee?.id !== null &&
				fee.eventFee?.feeType !== null &&
				fee.eventFee?.feeType?.id !== null,
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
		if (!slot.player?.id) {
			return false
		}
		if (!hasValidFees(slot.fees)) {
			return false
		}
		return true
	})
}

/**
 * Validates a Registration ensuring all fields, including nested ones, are present and valid.
 * When hasCourseDetails is false, course and slot holes can be undefined/null.
 * @param registration The Registration to validate
 * @param hasCourseDetails Whether to require course details (default: true)
 * @returns ValidatedRegistration if validation passes, null otherwise
 */
export function validateRegistration(
	registration: Registration,
	hasCourseDetails = true,
): ValidatedRegistration | null {
	if (!registration?.id) {
		return null
	}

	if (!hasValidSlots(registration.slots, hasCourseDetails)) {
		return null
	}

	if (hasCourseDetails && !validateCourse(registration.course)) {
		return null
	}

	// If course is present, ensure courseId matches if set
	if (
		registration.course &&
		registration.courseId != null &&
		registration.course.id !== registration.courseId
	) {
		return null
	}

	// All validations passed, return narrowed type
	return registration as ValidatedRegistration
}

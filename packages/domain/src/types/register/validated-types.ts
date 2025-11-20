// Type intersections ensuring required fields for validated objects in Registration

import { ValidatedCourse, ValidatedHole } from "../courses/validated-types"
import { EventFee } from "../events/event-fee"
import { Player } from "./player"
import { Registration } from "./registration"
import { RegistrationFee } from "./registration-fee"
import { RegistrationSlot } from "./registration-slot"

export type ValidatedPlayer = Player & { id: number }

export type ValidatedEventFee = EventFee & { id: number }

export type ValidatedRegistrationFee = RegistrationFee & {
	id: number
	eventFee: ValidatedEventFee
}

export type ValidatedRegistrationSlot = RegistrationSlot & {
	id: number
	player?: ValidatedPlayer
	hole?: ValidatedHole | null
	fees?: ValidatedRegistrationFee[]
}

/**
 * A validated variation of Registration where all core fields and nested ids are guaranteed to be present.
 * course and slot holes are optional (enforced at runtime based on hasCourseDetails).
 * Used when validateRegistration passes full validation.
 */
export type ValidatedRegistration = Omit<Registration, "slots" | "course"> & {
	slots: ValidatedRegistrationSlot[]
	course?: ValidatedCourse | null
}

// Type intersections ensuring required fields for validated objects in Registration

import { ValidatedCourse, ValidatedHole } from "../courses/validated-types"
import { ValidatedEventFee } from "../events/validated-types"
import { Player } from "./player"
import { RegisteredPlayer } from "./registered-player"
import { Registration } from "./registration"
import { RegistrationFee } from "./registration-fee"
import { RegistrationSlot } from "./registration-slot"

export type ValidatedPlayer = Player & { id: number }

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
	id: number
	slots: ValidatedRegistrationSlot[]
	course?: ValidatedCourse | null
}

/**
 * A validated variation of RegisteredPlayer where all core fields are guaranteed to be present.
 * course is optional (enforced at runtime based on hasCourseDetails).
 * Used when validateRegisteredPlayer passes full validation.
 */
export type ValidatedRegisteredPlayer = RegisteredPlayer & {
	player: ValidatedPlayer
	registration: Registration & { id: number }
	slot: ValidatedRegistrationSlot
	course?: ValidatedCourse | null
	fees?: ValidatedRegistrationFee[]
}

// Type intersections ensuring required fields for validated objects in Registration

import { Course } from "../courses"
import { Hole } from "../courses/hole"
import { ValidatedCourse } from "../courses/validated-types"
import { ValidatedEventFee } from "../events/validated-types"
import { Player } from "./player"
import { Registration } from "./registration"
import { RegistrationFee } from "./registration-fee"
import { RegistrationSlot } from "./registration-slot"

export type ValidatedRegistrationFee = Omit<RegistrationFee, "eventFee"> & {
	eventFee: ValidatedEventFee
}

export type ValidatedRegistrationSlot = Omit<RegistrationSlot, "player | hole | fees"> & {
	player: Player
	hole: Hole
	fees: ValidatedRegistrationFee[]
}

/**
 * A validated variation of Registration where all core fields and nested ids are guaranteed to be present.
 */
export type ValidatedRegistration = Omit<Registration, "slots" | "course"> & {
	startingHoleNumber: number
	startingOrder: number
	slots: ValidatedRegistrationSlot[]
	course: ValidatedCourse
}

/**
 * A validated variation of RegisteredPlayer where all core fields are guaranteed to be present.
 * course is optional (enforced at runtime based on hasCourseDetails).
 * Used when validateRegisteredPlayer passes full validation.
 */
export type ValidatedRegisteredPlayer = {
	player: Player
	registration: Registration
	slot: RegistrationSlot
	course: Course
	hole: Hole
	fees: ValidatedRegistrationFee[]
}

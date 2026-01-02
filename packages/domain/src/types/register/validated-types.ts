// Type intersections ensuring required fields for validated objects in Registration

import { Course } from "../courses"
import { Hole } from "../courses/hole"
import { CompleteCourse } from "../courses/validated-types"
import { EventFeeWithType } from "../events/validated-types"
import { Payment } from "./payment"
import { Player } from "./player"
import { Registration } from "./registration"
import { RegistrationFee } from "./registration-fee"
import { RegistrationSlot } from "./registration-slot"

export type CompleteRegistrationFee = Omit<RegistrationFee, "eventFee"> & {
	eventFee: EventFeeWithType
}

export type RegistrationSlotWithPlayer = Omit<RegistrationSlot, "player"> & {
	player: Player | null
}

export type RegistrationSlotWithPlayerAndFees = Omit<RegistrationSlot, "player" | "fees"> & {
	player: Player | null
	fees: RegistrationFee[]
}

export type CompleteRegistrationSlot = Omit<RegistrationSlot, "player" | "hole" | "fees"> & {
	player: Player
	hole: Hole
	fees: CompleteRegistrationFee[]
}

/**
 * A variation of Registration used in the registration flow.
 */
export type RegistrationWithSlots = Omit<Registration, "slots"> & {
	slots: RegistrationSlotWithPlayerAndFees[]
}

/**
 * A validated variation of Registration where all core fields and nested ids are guaranteed to be present.
 */
export type CompleteRegistration = Omit<Registration, "slots" | "course"> & {
	slots: CompleteRegistrationSlot[]
	course: CompleteCourse
}

/**
 * A validated variation of RegisteredPlayer where all core fields are guaranteed to be present.
 * course is optional (enforced at runtime based on hasCourseDetails).
 * Used when validateRegisteredPlayer passes full validation.
 */
export type RegisteredPlayer = {
	player: Player
	registration: Registration
	slot: RegistrationSlot
	course: Course
	hole: Hole
	fees: CompleteRegistrationFee[]
}

export type PaymentWithDetails = Payment & {
	details: RegistrationFee[]
}

export type CompletePayment = Payment & {
	details: CompleteRegistrationFee[]
}

export interface RegistrationAndPayment {
	registration: RegistrationWithSlots
	payment: PaymentWithDetails
}

export interface CompleteRegistrationAndPayment {
	registration: CompleteRegistration
	payment: CompletePayment
}

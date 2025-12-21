import { Hole } from "../courses/hole"
import { Player } from "./player"
import { RegistrationFee } from "./registration-fee"
import type { RegistrationStatusValue } from "./choices"

export interface RegistrationSlot {
	id: number
	registrationId: number
	eventId: number
	startingOrder: number
	slot: number
	status: RegistrationStatusValue
	holeId?: number | null
	hole?: Hole
	playerId?: number | null
	player?: Player
	ggId?: string | null
	fees?: RegistrationFee[]
}

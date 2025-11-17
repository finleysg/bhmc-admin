import { HoleDto } from "../courses/hole.dto"
import { PlayerDto } from "./player.dto"
import { RegistrationFeeDto } from "./registration-fee.dto"

export interface RegistrationSlotDto {
	id: number
	registrationId: number
	eventId: number
	startingOrder: number
	slot: number
	status: string
	holeId?: number | null
	hole?: HoleDto
	playerId?: number | null
	player?: PlayerDto
	ggId?: string | null
	fees?: RegistrationFeeDto[]
}

import { PlayerDto } from "./player.dto"
import { RegistrationFeeDto } from "./registration-fee.dto"

export interface RegistrationSlotDto {
	id: number
	startingOrder: number
	slot: number
	status: string
	holeId?: number | null
	player?: PlayerDto
	fees: RegistrationFeeDto[]
}

import { EventPlayerFeeDto } from "./event-player-fee.dto"

export class EventPlayerSlotDto {
	team!: string
	course!: string
	start!: string
	ghin?: string | null
	age!: number
	tee?: string | null
	lastName!: string
	firstName!: string
	fullName!: string
	email?: string | null
	signedUpBy?: string | null
	fees!: EventPlayerFeeDto[]
}

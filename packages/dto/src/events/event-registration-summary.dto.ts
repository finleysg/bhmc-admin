import { EventPlayerSlotDto } from "./event-player-slot.dto"

export class EventRegistrationSummaryDto {
	eventId!: number
	total!: number
	slots!: EventPlayerSlotDto[]
}

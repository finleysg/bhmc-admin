import { Controller, Get, Logger, Param, ParseIntPipe, Query } from "@nestjs/common"
import { ClubEvent } from "@repo/domain/types"

import { EventsRepository } from "./events.repository"
import { toEvent } from "./mappers"

@Controller("events")
export class EventsController {
	private readonly logger = new Logger(EventsController.name)

	constructor(private readonly events: EventsRepository) {}

	@Get("search")
	async searchEventsByDate(@Query("date") date: string): Promise<ClubEvent[]> {
		this.logger.log("Received date: " + date)
		if (!date) {
			throw new Error("Date query parameter is required")
		}
		const results = await this.events.findEventsByDate(date)
		return results.map((r) => toEvent(r))
	}

	@Get(":eventId")
	async getEventById(@Param("eventId", ParseIntPipe) eventId: number): Promise<ClubEvent> {
		const event = await this.events.findEventById(eventId)
		if (!event) {
			throw new Error(`ClubEvent ${eventId} not found`)
		}
		return toEvent(event)
	}
}

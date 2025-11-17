import { Controller, Get, Logger, Param, ParseIntPipe, Query } from "@nestjs/common"
import { EventDto } from "@repo/domain"

import { EventsService } from "./events.service"

@Controller("events")
export class EventsController {
	private readonly logger = new Logger(EventsController.name)

	constructor(private readonly events: EventsService) {}

	@Get("search")
	async searchEventsByDate(@Query("date") date: string): Promise<EventDto[]> {
		this.logger.log("Received date: " + date)
		if (!date) {
			throw new Error("Date query parameter is required")
		}
		return this.events.findEventsByDate(date)
	}

	@Get(":eventId")
	async getEventById(@Param("eventId", ParseIntPipe) eventId: number): Promise<EventDto> {
		const event = await this.events.findEventById({ eventId })
		if (!event) {
			throw new Error(`Event ${eventId} not found`)
		}
		return event
	}
}

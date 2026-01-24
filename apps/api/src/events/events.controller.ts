import {
	ClassSerializerInterceptor,
	Controller,
	Get,
	Inject,
	Logger,
	NotFoundException,
	Param,
	ParseIntPipe,
	Query,
	UseInterceptors,
} from "@nestjs/common"
import { ClubEvent } from "@repo/domain/types"

import { Admin } from "../auth"
import { RegistrationRepository } from "../registration/repositories/registration.repository"

import { EventsRepository } from "./events.repository"
import { toEvent } from "./mappers"
import { EventsService } from "./events.service"

@Controller("events")
@Admin()
export class EventsController {
	private readonly logger = new Logger(EventsController.name)

	constructor(
		@Inject(EventsRepository) private readonly events: EventsRepository,
		@Inject(EventsService) private readonly service: EventsService,
		@Inject(RegistrationRepository) private readonly registrations: RegistrationRepository,
	) {}

	@Get()
	async getEventsBySeason(@Query("season", ParseIntPipe) season: number): Promise<ClubEvent[]> {
		return this.service.getEventsBySeason(season)
	}

	@Get("search")
	async searchEventsByDate(@Query("date") date: string): Promise<ClubEvent[]> {
		this.logger.log("Received date: " + date)
		if (!date) {
			throw new Error("Date query parameter is required")
		}
		const results = await this.events.findEventsByDate(date)
		return results.map((r) => toEvent(r))
	}

	@Get("season-registration/:season")
	async getSeasonRegistrationEventId(
		@Param("season", ParseIntPipe) season: number,
	): Promise<{ eventId: number }> {
		const eventId = await this.service.getSeasonRegistrationEventId(season)
		return { eventId }
	}

	@Get(":eventId/available-slot-count")
	async getAvailableSlotCount(
		@Param("eventId", ParseIntPipe) eventId: number,
	): Promise<{ count: number }> {
		const event = await this.events.findEventById(eventId)
		if (!event) {
			throw new NotFoundException(`Event with id ${eventId} not found`)
		}
		const count = await this.registrations.countAvailableSlots(eventId)
		return { count }
	}

	@UseInterceptors(ClassSerializerInterceptor)
	@Get(":eventId")
	async getEventById(@Param("eventId", ParseIntPipe) eventId: number): Promise<ClubEvent> {
		return await this.service.getCompleteClubEventById(eventId, false)
	}
}

import {
	Body,
	ClassSerializerInterceptor,
	Controller,
	Get,
	Inject,
	Logger,
	Param,
	ParseIntPipe,
	Post,
	Query,
	UseInterceptors,
} from "@nestjs/common"
import { ClubEvent, PayoutSummary } from "@repo/domain/types"

import { Admin } from "../auth"

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

	@Get(":eventId/payouts")
	async getPayoutSummary(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Query("payoutType") payoutType: string,
	): Promise<PayoutSummary[]> {
		return this.service.getPayoutSummary(eventId, payoutType)
	}

	@Post(":eventId/payouts/mark-paid")
	async markPayoutsPaid(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body("payoutType") payoutType: string,
	): Promise<PayoutSummary[]> {
		return this.service.markPayoutsPaid(eventId, payoutType)
	}

	@UseInterceptors(ClassSerializerInterceptor)
	@Get(":eventId")
	async getEventById(@Param("eventId", ParseIntPipe) eventId: number): Promise<ClubEvent> {
		return await this.service.getCompleteClubEventById(eventId, false)
	}
}

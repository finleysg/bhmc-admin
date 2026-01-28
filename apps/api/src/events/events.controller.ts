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
import { MailService } from "../mail/mail.service"

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
		@Inject(MailService) private readonly mail: MailService,
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
		const payouts = await this.service.markPayoutsPaid(eventId, payoutType)

		const event = await this.service.getEventById(eventId)
		const eventDate = new Date(event.startDate).toLocaleDateString("en-US", {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
		})

		// Fire-and-forget: send payout notifications without blocking the response
		void this.mail.sendPayoutNotification(event.name, eventDate, payouts).catch((error) => {
			this.logger.error(
				`Failed to send payout notifications for event ${eventId}: ${error instanceof Error ? error.message : "Unknown error"}`,
			)
		})

		return payouts
	}

	@UseInterceptors(ClassSerializerInterceptor)
	@Get(":eventId")
	async getEventById(@Param("eventId", ParseIntPipe) eventId: number): Promise<ClubEvent> {
		return await this.service.getCompleteClubEventById(eventId, false)
	}
}

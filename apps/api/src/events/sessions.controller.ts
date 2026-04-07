import {
	Body,
	Controller,
	Delete,
	Get,
	Inject,
	Param,
	ParseIntPipe,
	Post,
	Put,
} from "@nestjs/common"
import type { EventSessionWithFees } from "@repo/domain/types"

import { Admin } from "../auth"
import { EventsService } from "./events.service"

interface SessionFeeOverrideDto {
	eventFeeId: number
	amount: number
}

interface CreateSessionDto {
	name: string
	registrationLimit: number
	displayOrder: number
	feeOverrides?: SessionFeeOverrideDto[]
}

interface UpdateSessionDto {
	name?: string
	registrationLimit?: number
	displayOrder?: number
	feeOverrides?: SessionFeeOverrideDto[]
}

@Controller("events/:eventId/sessions")
@Admin()
export class SessionsController {
	constructor(@Inject(EventsService) private readonly service: EventsService) {}

	@Get()
	async listSessions(
		@Param("eventId", ParseIntPipe) eventId: number,
	): Promise<EventSessionWithFees[]> {
		return this.service.getSessionsWithFees(eventId)
	}

	@Post()
	async createSession(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() body: CreateSessionDto,
	): Promise<EventSessionWithFees> {
		return this.service.createSession(
			eventId,
			{
				name: body.name,
				registrationLimit: body.registrationLimit,
				displayOrder: body.displayOrder,
			},
			body.feeOverrides ?? [],
		)
	}

	@Put(":sessionId")
	async updateSession(
		@Param("sessionId", ParseIntPipe) sessionId: number,
		@Body() body: UpdateSessionDto,
	): Promise<EventSessionWithFees> {
		const { feeOverrides, ...data } = body
		return this.service.updateSession(sessionId, data, feeOverrides)
	}

	@Delete(":sessionId")
	async deleteSession(@Param("sessionId", ParseIntPipe) sessionId: number): Promise<void> {
		await this.service.deleteSession(sessionId)
	}
}

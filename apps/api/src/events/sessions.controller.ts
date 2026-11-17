import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Inject,
	Param,
	ParseIntPipe,
	Post,
	Put,
	UseInterceptors,
} from "@nestjs/common"
import type { EventSessionWithFees } from "@repo/domain/types"

import { Audit, type AuditContext } from "../audit"
import { EventAdmin } from "../auth"
import { RevalidatePublicEventsInterceptor } from "../public-site"
import { EventsService } from "./events.service"
import { SessionSetupService } from "./setup/session-setup.service"

@Controller("events/:eventId/sessions")
@EventAdmin()
@UseInterceptors(RevalidatePublicEventsInterceptor)
export class SessionsController {
	constructor(
		@Inject(EventsService) private readonly service: EventsService,
		@Inject(SessionSetupService) private readonly sessions: SessionSetupService,
	) {}

	@Get()
	async listSessions(
		@Param("eventId", ParseIntPipe) eventId: number,
	): Promise<EventSessionWithFees[]> {
		return this.service.getSessionsWithFees(eventId)
	}

	@Post()
	async createSession(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() body: unknown,
		@Audit() audit: AuditContext,
	): Promise<EventSessionWithFees> {
		return this.sessions.createSession(eventId, body, audit)
	}

	@Put(":sessionId")
	async updateSession(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Param("sessionId", ParseIntPipe) sessionId: number,
		@Body() body: unknown,
		@Audit() audit: AuditContext,
	): Promise<EventSessionWithFees> {
		return this.sessions.updateSession(eventId, sessionId, body, audit)
	}

	@Delete(":sessionId")
	@HttpCode(204)
	async deleteSession(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Param("sessionId", ParseIntPipe) sessionId: number,
		@Audit() audit: AuditContext,
	): Promise<void> {
		await this.sessions.deleteSession(eventId, sessionId, audit)
	}
}

import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Inject,
	Param,
	ParseIntPipe,
	Post,
	Query,
} from "@nestjs/common"
import type { EventReadiness, ReadinessSummary } from "@repo/domain/types"
import { z } from "zod"

import { Audit, type AuditContext } from "../audit"
import { EventAdmin } from "../auth"
import { parseBody } from "../events/setup/event-setup.schemas"

import { ReadinessService, summarize } from "./readiness.service"

const warningSchema = z.object({
	code: z.string().min(1).max(40),
	subject: z.string().max(60).default(""),
})

/** Ready to Open Registration readiness (Event Admin). */
@Controller()
@EventAdmin()
export class ReadinessController {
	constructor(@Inject(ReadinessService) private readonly service: ReadinessService) {}

	@Get("events/:eventId/readiness")
	async forEvent(@Param("eventId", ParseIntPipe) eventId: number): Promise<EventReadiness> {
		return this.service.forEvent(eventId)
	}

	@Get("readiness")
	async forSeason(@Query("season") season: string): Promise<ReadinessSummary[]> {
		const year = Number(season)
		if (!Number.isInteger(year)) throw new BadRequestException("season is required")
		return (await this.service.forSeason(year)).map(summarize)
	}

	@Post("events/:eventId/readiness/dismissals")
	async dismiss(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() body: unknown,
		@Audit() audit: AuditContext,
	): Promise<EventReadiness> {
		const { code, subject } = parseBody(warningSchema, body)
		return this.service.dismiss(eventId, code, subject, audit)
	}

	@Delete("events/:eventId/readiness/dismissals")
	async restore(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Query() query: unknown,
		@Audit() audit: AuditContext,
	): Promise<EventReadiness> {
		const { code, subject } = parseBody(warningSchema, query)
		return this.service.restore(eventId, code, subject, audit)
	}
}

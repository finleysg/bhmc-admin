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
	Query,
	UseInterceptors,
} from "@nestjs/common"
import type { InspectorSearchResult, RegistrationInspection } from "@repo/domain/types"

import { Audit, type AuditContext } from "../../audit"
import { EventAdmin } from "../../auth"
import { RevalidatePublicEventsInterceptor } from "../../public-site"

import { InspectorService } from "./inspector.service"

/** The Registration Inspector: diagnose an event's registrations and make targeted repairs (Event Admin). */
@Controller("registration-inspector")
@EventAdmin()
export class InspectorController {
	constructor(@Inject(InspectorService) private readonly service: InspectorService) {}

	/** The event's registrations; with `q`, only those of players matching a name, GHIN, or email. */
	@Get("events/:eventId/search")
	async search(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Query("q") q: string | undefined,
	): Promise<InspectorSearchResult[]> {
		return this.service.search(eventId, q ?? "")
	}

	@Get("events/:eventId/registrations/:registrationId")
	async inspect(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Param("registrationId", ParseIntPipe) registrationId: number,
	): Promise<RegistrationInspection> {
		return this.service.inspect(eventId, registrationId)
	}

	@Put("events/:eventId/slots/:slotId/status")
	@HttpCode(204)
	@UseInterceptors(RevalidatePublicEventsInterceptor)
	async setSlotStatus(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Param("slotId", ParseIntPipe) slotId: number,
		@Body() body: unknown,
		@Audit() audit: AuditContext,
	): Promise<void> {
		return this.service.setSlotStatus(eventId, slotId, body, audit)
	}

	@Post("events/:eventId/slots/:slotId/fees")
	@HttpCode(204)
	async addFee(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Param("slotId", ParseIntPipe) slotId: number,
		@Body() body: unknown,
		@Audit() audit: AuditContext,
	): Promise<void> {
		return this.service.addFee(eventId, slotId, body, audit)
	}

	@Delete("events/:eventId/fees/:feeId")
	@HttpCode(204)
	async removeFee(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Param("feeId", ParseIntPipe) feeId: number,
		@Query("refund") refund: string | undefined,
		@Audit() audit: AuditContext,
	): Promise<void> {
		return this.service.removeFee(eventId, feeId, refund === "true", audit)
	}
}

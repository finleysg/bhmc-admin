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
} from "@nestjs/common"
import type {
	ClubEvent,
	ContentTag,
	Course,
	EventFee,
	FeeType,
	SlotGroup,
} from "@repo/domain/types"

import { Audit, type AuditContext } from "../../audit"
import { EventAdmin } from "../../auth"

import { EventSetupService } from "./event-setup.service"
import { SlotSetupService } from "./slot-setup.service"

/** The event workspace: event settings, courses, and event fees (Event Admin). */
@Controller("events")
@EventAdmin()
export class EventSetupController {
	constructor(@Inject(EventSetupService) private readonly service: EventSetupService) {}

	@Post()
	async create(@Body() body: unknown, @Audit() audit: AuditContext): Promise<ClubEvent> {
		return this.service.createEvent(body, audit)
	}

	@Get(":eventId/setup")
	async getSetup(@Param("eventId", ParseIntPipe) eventId: number): Promise<ClubEvent> {
		return this.service.getSetup(eventId)
	}

	@Put(":eventId")
	async update(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() body: unknown,
		@Audit() audit: AuditContext,
	): Promise<ClubEvent> {
		return this.service.updateEvent(eventId, body, audit)
	}

	@Put(":eventId/courses")
	async setCourses(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() body: unknown,
		@Audit() audit: AuditContext,
	): Promise<ClubEvent> {
		return this.service.setCourses(eventId, body, audit)
	}

	@Post(":eventId/fees")
	async addFee(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() body: unknown,
		@Audit() audit: AuditContext,
	): Promise<EventFee> {
		return this.service.addFee(eventId, body, audit)
	}

	@Put(":eventId/fees/:feeId")
	async updateFee(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Param("feeId", ParseIntPipe) feeId: number,
		@Body() body: unknown,
		@Audit() audit: AuditContext,
	): Promise<EventFee> {
		return this.service.updateFee(eventId, feeId, body, audit)
	}

	@Delete(":eventId/fees/:feeId")
	@HttpCode(204)
	async deleteFee(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Param("feeId", ParseIntPipe) feeId: number,
		@Query("override") override: string | undefined,
		@Audit() audit: AuditContext,
	): Promise<void> {
		return this.service.deleteFee(eventId, feeId, override === "true", audit)
	}
}

/** Choices the event workspace offers (Event Admin). */
@Controller()
@EventAdmin()
export class EventSetupLookupsController {
	constructor(@Inject(EventSetupService) private readonly service: EventSetupService) {}

	@Get("fee-types")
	async listFeeTypes(): Promise<FeeType[]> {
		return this.service.listFeeTypes()
	}

	@Get("courses")
	async listCourses(): Promise<Course[]> {
		return this.service.listCourses()
	}

	@Get("tags")
	async listTags(): Promise<ContentTag[]> {
		return this.service.listTags()
	}
}

/** Registration slots for events where players choose their slot (Event Admin). */
@Controller("events/:eventId/slots")
@EventAdmin()
export class SlotSetupController {
	constructor(@Inject(SlotSetupService) private readonly service: SlotSetupService) {}

	@Get()
	async listGroups(@Param("eventId", ParseIntPipe) eventId: number): Promise<SlotGroup[]> {
		return this.service.listGroups(eventId)
	}

	@Post()
	async create(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Audit() audit: AuditContext,
	): Promise<SlotGroup[]> {
		return this.service.createSlots(eventId, audit)
	}

	@Post("tee-times")
	async appendTeeTime(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Audit() audit: AuditContext,
	): Promise<SlotGroup[]> {
		return this.service.appendTeeTime(eventId, audit)
	}

	@Delete("groups/:holeId/:startingOrder")
	async deleteGroup(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Param("holeId", ParseIntPipe) holeId: number,
		@Param("startingOrder", ParseIntPipe) startingOrder: number,
		@Audit() audit: AuditContext,
	): Promise<SlotGroup[]> {
		return this.service.deleteGroup(eventId, holeId, startingOrder, audit)
	}

	@Put("groups/:holeId/:startingOrder/status")
	async setGroupStatus(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Param("holeId", ParseIntPipe) holeId: number,
		@Param("startingOrder", ParseIntPipe) startingOrder: number,
		@Body() body: unknown,
		@Audit() audit: AuditContext,
	): Promise<SlotGroup[]> {
		return this.service.setGroupStatus(eventId, holeId, startingOrder, body, audit)
	}
}

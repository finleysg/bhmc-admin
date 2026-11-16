import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common"
import type { MySql2Database } from "drizzle-orm/mysql2"
import { type ClubEvent, type Course, type EventFee, type FeeType } from "@repo/domain/types"

import { AuditService, type AuditContext } from "../../audit"
import { toMysqlDatetime } from "../../common"
import { CoursesService } from "../../courses/courses.service"
import { toCourse } from "../../courses/mappers"
import {
	DrizzleService,
	type EventFeeInsert,
	type EventInsert,
	type EventRow,
} from "../../database"
import { EventsRepository } from "../events.repository"
import { EventsService } from "../events.service"
import {
	toEvent,
	toEventFee,
	toEventFeeWithType,
	toEventWithCompositions,
	toFeeType,
} from "../mappers"

import { EventSetupRepository } from "./event-setup.repository"
import {
	copyFromSchema,
	eventCoursesSchema,
	eventFeeSchema,
	eventSettingsSchema,
	parseBody,
	type EventFeeValues,
	type EventSettings,
} from "./event-setup.schemas"

const SETTINGS_FIELDS = Object.keys(eventSettingsSchema.shape) as (keyof EventSettings)[]
const FEE_FIELDS = [
	"feeTypeId",
	"amount",
	"isRequired",
	"displayOrder",
	"overrideAmount",
	"overrideRestriction",
] as const

/**
 * The event workspace: create, edit, and copy events, their courses, and
 * their event fees. Each change runs in one transaction with its audit entry.
 */
@Injectable()
export class EventSetupService {
	constructor(
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
		@Inject(EventSetupRepository) private readonly repository: EventSetupRepository,
		@Inject(EventsRepository) private readonly events: EventsRepository,
		@Inject(EventsService) private readonly eventsService: EventsService,
		@Inject(CoursesService) private readonly courses: CoursesService,
		@Inject(AuditService) private readonly audit: AuditService,
	) {}

	/** The event with its courses, fees, and sessions, complete or not. */
	async getSetup(eventId: number): Promise<ClubEvent> {
		if (!(await this.events.existsById(eventId))) {
			throw new NotFoundException(`Event ${eventId} not found`)
		}
		const row = await this.events.findEventById(eventId)
		const courses = await this.courses.findCoursesByEventId({ eventId })
		const eventFees = (await this.events.listEventFeesByEvent(eventId))
			.map(toEventFeeWithType)
			.sort((a, b) => a.displayOrder - b.displayOrder)
		const sessions = await this.eventsService.getSessionsWithFees(eventId)
		return toEventWithCompositions(row, { courses, eventFees, sessions })
	}

	async listFeeTypes(): Promise<FeeType[]> {
		return (await this.repository.listFeeTypes()).map(toFeeType)
	}

	async listCourses(): Promise<Course[]> {
		return (await this.repository.listCourses()).map(toCourse)
	}

	/**
	 * Creates an event. With `copyFromEventId`, the source event's courses, event
	 * fees, sessions, and session fees are copied into it in the same transaction
	 * (the settings come from the request, which the admin fills from the source).
	 * Registrations, slots, results, and documents are never copied.
	 */
	async createEvent(body: unknown, context: AuditContext): Promise<ClubEvent> {
		const settings = parseBody(eventSettingsSchema, body)
		const { copyFromEventId } = parseBody(copyFromSchema, body)
		const eventId = await this.drizzle.db.transaction(async (tx) => {
			if (copyFromEventId && !(await this.repository.lockEvent(tx, copyFromEventId))) {
				throw new BadRequestException(`Event ${copyFromEventId} to copy from not found`)
			}
			await this.refuseDuplicateName(tx, settings.name, settings.startDate)
			const id = await this.repository.insertEvent(tx, toEventValues(settings))
			if (copyFromEventId) await this.copySetup(tx, copyFromEventId, id)

			const created = await this.repository.findEvent(tx, id)
			await this.audit.record(tx, context, {
				operation: "event.create",
				entityType: "event",
				entityId: id,
				eventId: id,
				before: {},
				after: { ...settingsOf(created), copiedFromEventId: copyFromEventId },
			})
			return id
		})
		return this.getSetup(eventId)
	}

	async updateEvent(eventId: number, body: unknown, context: AuditContext): Promise<ClubEvent> {
		const settings = parseBody(eventSettingsSchema, body)
		await this.drizzle.db.transaction(async (tx) => {
			const before = await this.lockEvent(tx, eventId)
			await this.refuseDuplicateName(tx, settings.name, settings.startDate, eventId)
			await this.repository.updateEvent(tx, eventId, toEventValues(settings))
			const after = await this.repository.findEvent(tx, eventId)
			await this.audit.record(tx, context, {
				operation: "event.update",
				entityType: "event",
				entityId: eventId,
				eventId,
				before: settingsOf(before),
				after: settingsOf(after),
			})
		})
		return this.getSetup(eventId)
	}

	/**
	 * Replaces the event's courses. A course that already has registration
	 * slots for this event cannot be removed: delete those slots first.
	 */
	async setCourses(eventId: number, body: unknown, context: AuditContext): Promise<ClubEvent> {
		const courseIds = [...new Set(parseBody(eventCoursesSchema, body).courseIds)].sort(
			(a, b) => a - b,
		)
		await this.drizzle.db.transaction(async (tx) => {
			await this.lockEvent(tx, eventId)
			const existing = await this.repository.findExistingCourseIds(tx, courseIds)
			const unknown = courseIds.filter((id) => !existing.includes(id))
			if (unknown.length > 0) {
				throw new BadRequestException(`Unknown course id(s): ${unknown.join(", ")}`)
			}

			const before = await this.repository.findCourseIds(tx, eventId)
			const removed = before.filter((id) => !courseIds.includes(id))
			const added = courseIds.filter((id) => !before.includes(id))
			const slots = await this.repository.countSlotsOnCourses(tx, eventId, removed)
			if (slots > 0) {
				throw new ConflictException(
					`Cannot remove a course that has ${slots} registration slot(s) for this event. Delete those slots first.`,
				)
			}

			await this.repository.removeCourses(tx, eventId, removed)
			await this.repository.addCourses(tx, eventId, added)
			await this.audit.record(tx, context, {
				operation: "event.courses.update",
				entityType: "event",
				entityId: eventId,
				eventId,
				before: { courseIds: before },
				after: { courseIds },
			})
		})
		return this.getSetup(eventId)
	}

	async addFee(eventId: number, body: unknown, context: AuditContext): Promise<EventFee> {
		const values = parseBody(eventFeeSchema, body)
		const feeId = await this.drizzle.db.transaction(async (tx) => {
			await this.lockEvent(tx, eventId)
			await this.checkFeeType(tx, eventId, values.feeTypeId)
			const displayOrder =
				values.displayOrder ?? (await this.repository.nextFeeDisplayOrder(tx, eventId))
			const id = await this.repository.insertFee(tx, {
				eventId,
				...toFeeValues({ ...values, displayOrder }),
			} as EventFeeInsert)
			await this.audit.record(tx, context, {
				operation: "event.fee.create",
				entityType: "event_fee",
				entityId: id,
				eventId,
				before: {},
				after: feeOf(toEventFee(await this.repository.findFee(tx, id))),
			})
			return id
		})
		return this.getFee(eventId, feeId)
	}

	async updateFee(
		eventId: number,
		feeId: number,
		body: unknown,
		context: AuditContext,
	): Promise<EventFee> {
		const values = parseBody(eventFeeSchema, body)
		await this.drizzle.db.transaction(async (tx) => {
			await this.lockEvent(tx, eventId)
			const before = await this.lockFee(tx, eventId, feeId)
			if (values.feeTypeId !== before.feeTypeId) {
				await this.checkFeeType(tx, eventId, values.feeTypeId)
			}
			await this.repository.updateFee(
				tx,
				feeId,
				toFeeValues({ ...values, displayOrder: values.displayOrder ?? before.displayOrder }),
			)
			await this.audit.record(tx, context, {
				operation: "event.fee.update",
				entityType: "event_fee",
				entityId: feeId,
				eventId,
				before: feeOf(toEventFee(before)),
				after: feeOf(toEventFee(await this.repository.findFee(tx, feeId))),
			})
		})
		return this.getFee(eventId, feeId)
	}

	/** Refused once a registration has been charged the fee or a session overrides it. */
	async deleteFee(eventId: number, feeId: number, context: AuditContext): Promise<void> {
		await this.drizzle.db.transaction(async (tx) => {
			await this.lockEvent(tx, eventId)
			const before = await this.lockFee(tx, eventId, feeId)
			const charged = await this.repository.countRegistrationFees(tx, feeId)
			if (charged > 0) {
				throw new ConflictException(
					`Cannot delete a fee that ${charged} registration fee record(s) refer to`,
				)
			}
			const sessionFees = await this.repository.countSessionFees(tx, feeId)
			if (sessionFees > 0) {
				throw new ConflictException(
					"Cannot delete a fee that a session overrides. Remove it from the sessions first.",
				)
			}
			await this.repository.deleteFee(tx, feeId)
			const fee = feeOf(toEventFee(before))
			await this.audit.record(tx, context, {
				operation: "event.fee.delete",
				entityType: "event_fee",
				entityId: feeId,
				eventId,
				before: fee,
				after: Object.fromEntries(Object.keys(fee).map((k) => [k, null])),
			})
		})
	}

	/** Copies courses, event fees, sessions, and session fees from one event to another. */
	private async copySetup(tx: MySql2Database, sourceId: number, targetId: number): Promise<void> {
		await this.repository.addCourses(
			tx,
			targetId,
			await this.repository.findCourseIds(tx, sourceId),
		)

		const feeIds = new Map<number, number>()
		for (const { id: sourceFeeId, ...fee } of await this.repository.findFees(tx, sourceId)) {
			feeIds.set(sourceFeeId, await this.repository.insertFee(tx, { ...fee, eventId: targetId }))
		}

		const sessions = await this.repository.findSessions(tx, sourceId)
		const sessionFees = await this.repository.findSessionFees(
			tx,
			sessions.map((s) => s.id),
		)
		for (const { id: sourceSessionId, ...session } of sessions) {
			const sessionId = await this.repository.insertSession(tx, { ...session, eventId: targetId })
			for (const sf of sessionFees.filter((f) => f.sessionId === sourceSessionId)) {
				await this.repository.insertSessionFee(tx, {
					sessionId,
					eventFeeId: feeIds.get(sf.eventFeeId)!,
					amount: sf.amount,
				})
			}
		}
	}

	private async getFee(eventId: number, feeId: number): Promise<EventFee> {
		const fee = (await this.events.listEventFeesByEvent(eventId)).find(
			(f) => f.eventFee.id === feeId,
		)
		return toEventFeeWithType(fee!)
	}

	private async lockEvent(tx: MySql2Database, eventId: number): Promise<EventRow> {
		const row = await this.repository.lockEvent(tx, eventId)
		if (!row) throw new NotFoundException(`Event ${eventId} not found`)
		return row
	}

	private async lockFee(tx: MySql2Database, eventId: number, feeId: number) {
		const row = await this.repository.lockFee(tx, eventId, feeId)
		if (!row) throw new NotFoundException(`Event fee ${feeId} not found on event ${eventId}`)
		return row
	}

	private async refuseDuplicateName(
		tx: MySql2Database,
		name: string,
		startDate: string,
		exceptId?: number,
	): Promise<void> {
		if (await this.repository.nameTaken(tx, name, startDate, exceptId)) {
			throw new ConflictException(`An event named "${name}" already exists on ${startDate}`)
		}
	}

	private async checkFeeType(tx: MySql2Database, eventId: number, feeTypeId: number) {
		if (!(await this.repository.feeTypeExists(tx, feeTypeId))) {
			throw new BadRequestException(`Unknown fee type ${feeTypeId}`)
		}
		const fees = await this.repository.findFees(tx, eventId)
		if (fees.some((f) => f.feeTypeId === feeTypeId)) {
			throw new ConflictException("The event already has a fee of this type")
		}
	}
}

function toEventValues(s: EventSettings): Omit<EventInsert, "id"> {
	const dt = (value: string | null) => (value ? toMysqlDatetime(value) : null)
	return {
		...s,
		canChoose: s.canChoose ? 1 : 0,
		ghinRequired: s.ghinRequired ? 1 : 0,
		prioritySignupStart: dt(s.prioritySignupStart),
		signupStart: dt(s.signupStart),
		signupEnd: dt(s.signupEnd),
		paymentsEnd: dt(s.paymentsEnd),
	}
}

function settingsOf(row: EventRow): Record<string, unknown> {
	const view = toEvent(row) as unknown as Record<string, unknown>
	return Object.fromEntries(SETTINGS_FIELDS.map((f) => [f, view[f] ?? null]))
}

function toFeeValues(v: EventFeeValues & { displayOrder: number }): Partial<EventFeeInsert> {
	return {
		feeTypeId: v.feeTypeId,
		amount: v.amount.toFixed(2),
		isRequired: v.isRequired ? 1 : 0,
		displayOrder: v.displayOrder,
		overrideAmount: v.overrideAmount == null ? null : v.overrideAmount.toFixed(2),
		overrideRestriction: v.overrideRestriction ?? null,
	}
}

function feeOf(fee: EventFee): Record<string, unknown> {
	const view = fee as unknown as Record<string, unknown>
	return Object.fromEntries(FEE_FIELDS.map((f) => [f, view[f] ?? null]))
}

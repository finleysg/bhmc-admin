import { asc, eq } from "drizzle-orm"

import { Inject, Injectable, Logger } from "@nestjs/common"

import { getStart } from "@repo/domain/functions"

import { CoursesService } from "../../courses/courses.service"
import {
	DrizzleService,
	course,
	hole,
	registrationFee,
	registrationSlot,
	toDbString,
} from "../../database"
import { EventsService } from "../../events"
import { ChangeLogRepository } from "../repositories/changelog.repository"
import { RegistrationRepository } from "../repositories/registration.repository"

interface ChangeLogEntry {
	eventId: number
	registrationId: number
	action: string
	actorId: number
	isAdmin: boolean
	details: Record<string, unknown>
}

@Injectable()
export class ChangeLogService {
	private readonly logger = new Logger(ChangeLogService.name)

	constructor(
		@Inject(ChangeLogRepository) private readonly repository: ChangeLogRepository,
		@Inject(CoursesService) private readonly courses: CoursesService,
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
		@Inject(EventsService) private readonly events: EventsService,
		@Inject(RegistrationRepository) private readonly registrationRepo: RegistrationRepository,
	) {}

	async log(entry: ChangeLogEntry): Promise<void> {
		try {
			await this.repository.create({
				eventId: entry.eventId,
				registrationId: entry.registrationId,
				action: entry.action,
				actorId: entry.actorId,
				isAdmin: entry.isAdmin ? 1 : 0,
				details: entry.details,
				createdDate: toDbString(new Date()),
			})
		} catch (error) {
			this.logger.error(
				`Failed to write changelog entry: ${entry.action} for event ${entry.eventId}`,
				error,
			)
		}
	}

	async resolvePlayerNames(playerIds: number[]): Promise<string[]> {
		if (!playerIds.length) return []
		const players = await this.registrationRepo.findPlayersByIds(playerIds)
		return players.map((p) => `${p.firstName} ${p.lastName}`)
	}

	async resolveRegistrationIdFromSlotId(slotId: number): Promise<number | null> {
		const [slot] = await this.drizzle.db
			.select({ registrationId: registrationSlot.registrationId })
			.from(registrationSlot)
			.where(eq(registrationSlot.id, slotId))
			.limit(1)
		return slot?.registrationId ?? null
	}

	async resolveRegistrationIdFromFeeId(feeId: number): Promise<number | null> {
		const [fee] = await this.drizzle.db
			.select({ registrationSlotId: registrationFee.registrationSlotId })
			.from(registrationFee)
			.where(eq(registrationFee.id, feeId))
			.limit(1)
		if (!fee?.registrationSlotId) return null

		const [slot] = await this.drizzle.db
			.select({ registrationId: registrationSlot.registrationId })
			.from(registrationSlot)
			.where(eq(registrationSlot.id, fee.registrationSlotId))
			.limit(1)
		return slot?.registrationId ?? null
	}

	async resolveStartInfo(
		registrationId: number,
		eventId: number,
	): Promise<{ course?: string; start?: string }> {
		try {
			const result = await this.loadCourseAndEvent(registrationId, eventId)
			if (!result) return {}

			const [firstSlot] = await this.drizzle.db
				.select({
					id: registrationSlot.id,
					startingOrder: registrationSlot.startingOrder,
					holeId: registrationSlot.holeId,
					slot: registrationSlot.slot,
				})
				.from(registrationSlot)
				.where(eq(registrationSlot.registrationId, registrationId))
				.orderBy(asc(registrationSlot.slot))
				.limit(1)

			if (!firstSlot) return { course: result.courseName }

			const start = this.computeStart(result.event, firstSlot as never, result.holes)

			return { course: result.courseName, start }
		} catch (error) {
			this.logger.error(`Failed to resolve start info for registration ${registrationId}`, error)
			return {}
		}
	}

	async resolveMoveDetails(
		registrationId: number,
		eventId: number,
		sourceSlot: { holeId?: number | null; startingOrder: number },
		destinationHoleId: number,
		destinationStartingOrder: number,
	): Promise<{ fromCourse?: string; from?: string; toCourse?: string; to?: string }> {
		try {
			const event = await this.events.getEventById(eventId)

			// Source: resolve from the registration's course
			const sourceResult = await this.loadCourseAndEvent(registrationId, eventId)
			const fromCourse = sourceResult?.courseName
			const from = sourceResult
				? this.computeStart(event, sourceSlot as never, sourceResult.holes)
				: undefined

			// Destination: resolve from the destination hole's course
			const [destHoleRow] = await this.drizzle.db
				.select({ courseName: course.name, courseId: course.id })
				.from(hole)
				.innerJoin(course, eq(hole.courseId, course.id))
				.where(eq(hole.id, destinationHoleId))
				.limit(1)

			let toCourse: string | undefined
			let to: string | undefined
			if (destHoleRow) {
				toCourse = destHoleRow.courseName
				const destCourseWithHoles = await this.courses.findCourseWithHolesById(destHoleRow.courseId)
				to = this.computeStart(
					event,
					{ holeId: destinationHoleId, startingOrder: destinationStartingOrder } as never,
					destCourseWithHoles.holes,
				)
			}

			return { fromCourse, from, toCourse, to }
		} catch (error) {
			this.logger.error(`Failed to resolve move details for registration ${registrationId}`, error)
			return {}
		}
	}

	private async loadCourseAndEvent(registrationId: number, eventId: number) {
		const regWithCourse = await this.registrationRepo.findRegistrationWithCourse(registrationId)
		if (!regWithCourse?.course) return null

		const courseName = regWithCourse.course.name
		const courseWithHoles = await this.courses.findCourseWithHolesById(regWithCourse.course.id)
		const event = await this.events.getEventById(eventId)

		return { courseName, event, holes: courseWithHoles.holes }
	}

	private computeStart(
		event: Parameters<typeof getStart>[0],
		slot: Parameters<typeof getStart>[1],
		holes: Parameters<typeof getStart>[2],
	): string | undefined {
		const startValue = getStart(event, slot, holes)
		return startValue !== "N/A" ? startValue : undefined
	}
}

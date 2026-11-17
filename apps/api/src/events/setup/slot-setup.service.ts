import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common"
import type { MySql2Database } from "drizzle-orm/mysql2"
import { RegistrationStatusChoices, StartTypeChoices, type SlotGroup } from "@repo/domain/types"

import { AuditService, type AuditContext } from "../../audit"
import { DrizzleService, type EventRow, type RegistrationSlotRow } from "../../database"

import { EventSetupRepository } from "./event-setup.repository"
import { registrationHasOpened } from "./registration-locks"
import { SlotSetupRepository, type NewSlot } from "./slot-setup.repository"

const { AVAILABLE, UNAVAILABLE } = RegistrationStatusChoices

/**
 * Registration slots for events where players choose their slot, as explicit
 * operations: create (once), append a tee time, delete a group, and disable or
 * re-enable a group. Create and delete are refused once registration has
 * started; append and disable/enable are allowed at any time.
 */
@Injectable()
export class SlotSetupService {
	constructor(
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
		@Inject(EventSetupRepository) private readonly events: EventSetupRepository,
		@Inject(SlotSetupRepository) private readonly slots: SlotSetupRepository,
		@Inject(AuditService) private readonly audit: AuditService,
	) {}

	async listGroups(eventId: number): Promise<SlotGroup[]> {
		const groups = new Map<string, SlotGroup>()
		for (const s of await this.slots.listSlots(eventId)) {
			const key = `${s.holeId}:${s.startingOrder}`
			const group: SlotGroup = groups.get(key) ?? {
				courseId: s.courseId,
				courseName: s.courseName,
				holeId: s.holeId,
				holeNumber: s.holeNumber,
				startingOrder: s.startingOrder,
				statusCounts: {},
				filled: 0,
				total: 0,
				slots: [],
			}
			group.statusCounts[s.status] = (group.statusCounts[s.status] ?? 0) + 1
			if (s.playerId !== null) group.filled++
			group.total++
			group.slots.push({
				id: s.id,
				slot: s.slot,
				status: s.status,
				playerName: s.firstName ? `${s.firstName} ${s.lastName}` : null,
			})
			groups.set(key, group)
		}
		return [...groups.values()]
	}

	/**
	 * Creates every slot for an event that has none, all Available: per course,
	 * one group per tee time on hole 1, or an A and B group on every hole for a
	 * shotgun. A starter time interval needs no slots of its own: the tee time
	 * calculator (calculateTeeTime) leaves the starter's gap between start times.
	 */
	async createSlots(eventId: number, context: AuditContext): Promise<SlotGroup[]> {
		await this.drizzle.db.transaction(async (tx) => {
			const evt = await this.lockEvent(tx, eventId)
			requireChoosableSlots(evt)
			refuseAfterRegistrationOpens(evt, "create slots")
			if ((await this.slots.countSlots(tx, eventId)) > 0) {
				throw new ConflictException(
					"The event already has slots. Append a tee time or delete groups instead.",
				)
			}
			if (evt.startType === StartTypeChoices.TEETIMES && !evt.totalGroups) {
				throw new BadRequestException("Set the number of groups per course first")
			}

			const holes = await this.holes(tx, eventId)
			const groupSize = evt.groupSize!
			const slots: NewSlot[] = []
			if (evt.startType === StartTypeChoices.TEETIMES) {
				for (const h of firstHoles(holes)) {
					for (let order = 0; order < evt.totalGroups!; order++) {
						slots.push(...group(eventId, h.id, order, groupSize, AVAILABLE))
					}
				}
			} else {
				for (const h of holes) {
					slots.push(...group(eventId, h.id, 0, groupSize, AVAILABLE))
					slots.push(...group(eventId, h.id, 1, groupSize, AVAILABLE))
				}
			}

			await this.slots.insertSlots(tx, slots)
			await this.audit.record(tx, context, {
				operation: "event.slots.create",
				entityType: "event",
				entityId: eventId,
				eventId,
				before: { slotCount: 0 },
				after: { slotCount: slots.length },
			})
		})
		return this.listGroups(eventId)
	}

	/** Adds one tee time after the last, on every course, and raises the groups per course. */
	async appendTeeTime(eventId: number, context: AuditContext): Promise<SlotGroup[]> {
		await this.drizzle.db.transaction(async (tx) => {
			const evt = await this.lockEvent(tx, eventId)
			requireChoosableSlots(evt)
			if (evt.startType !== StartTypeChoices.TEETIMES) {
				throw new BadRequestException("Tee times can only be appended to a tee-time event")
			}
			const last = await this.slots.maxStartingOrder(tx, eventId)
			if (last === null)
				throw new ConflictException("The event has no slots yet. Create them first.")

			const order = last + 1
			const slots = firstHoles(await this.holes(tx, eventId)).flatMap((h) =>
				group(eventId, h.id, order, evt.groupSize!, AVAILABLE),
			)
			await this.slots.insertSlots(tx, slots)
			await this.events.updateEvent(tx, eventId, { totalGroups: order + 1 })
			await this.audit.record(tx, context, {
				operation: "event.slots.append",
				entityType: "event",
				entityId: eventId,
				eventId,
				before: { totalGroups: evt.totalGroups },
				after: { totalGroups: order + 1, appendedStartingOrder: order, slotCount: slots.length },
			})
		})
		return this.listGroups(eventId)
	}

	/** Deletes a group whose slots are all Available and empty, before registration opens. */
	async deleteGroup(
		eventId: number,
		holeId: number,
		startingOrder: number,
		context: AuditContext,
	): Promise<SlotGroup[]> {
		await this.drizzle.db.transaction(async (tx) => {
			const evt = await this.lockEvent(tx, eventId)
			refuseAfterRegistrationOpens(evt, "delete slots")
			const slots = await this.lockGroup(tx, eventId, holeId, startingOrder)
			if (
				slots.some(
					(s) => s.status !== AVAILABLE || s.playerId !== null || s.registrationId !== null,
				)
			) {
				throw new ConflictException(
					"Only a group whose slots are all Available and empty can be deleted",
				)
			}
			await this.slots.deleteSlots(
				tx,
				slots.map((s) => s.id),
			)

			const before: Record<string, unknown> = { slotIds: slots.map((s) => s.id) }
			const after: Record<string, unknown> = { slotIds: [] }
			if (evt.startType === StartTypeChoices.TEETIMES) {
				const totalGroups = ((await this.slots.maxStartingOrder(tx, eventId)) ?? -1) + 1
				await this.events.updateEvent(tx, eventId, { totalGroups })
				before.totalGroups = evt.totalGroups
				after.totalGroups = totalGroups
			}
			await this.audit.record(tx, context, {
				operation: "event.slots.delete",
				entityType: "event",
				entityId: eventId,
				eventId,
				before,
				after,
			})
		})
		return this.listGroups(eventId)
	}

	/**
	 * Disables (Available → Unavailable) or re-enables (Unavailable → Available)
	 * the empty slots of a group. Slots with a player, or mid-registration, are
	 * left alone. Allowed at any time.
	 */
	async setGroupStatus(
		eventId: number,
		holeId: number,
		startingOrder: number,
		body: unknown,
		context: AuditContext,
	): Promise<SlotGroup[]> {
		const status = (body as { status?: unknown } | undefined)?.status
		if (status !== AVAILABLE && status !== UNAVAILABLE) {
			throw new BadRequestException(`status must be "${AVAILABLE}" or "${UNAVAILABLE}"`)
		}
		await this.drizzle.db.transaction(async (tx) => {
			await this.lockEvent(tx, eventId)
			const slots = await this.lockGroup(tx, eventId, holeId, startingOrder)
			const from = status === UNAVAILABLE ? AVAILABLE : UNAVAILABLE
			const changing = slots.filter((s) => s.status === from && s.playerId === null)
			await this.slots.setStatus(
				tx,
				changing.map((s) => s.id),
				status,
			)

			const unavailable = (rows: RegistrationSlotRow[]) =>
				rows.filter((s) => s.status === UNAVAILABLE).map((s) => s.id)
			const changedIds = new Set(changing.map((s) => s.id))
			await this.audit.record(tx, context, {
				operation: status === UNAVAILABLE ? "event.slots.disable" : "event.slots.enable",
				entityType: "event",
				entityId: eventId,
				eventId,
				before: { unavailableSlotIds: unavailable(slots) },
				after: {
					unavailableSlotIds: unavailable(
						slots.map((s) => (changedIds.has(s.id) ? { ...s, status } : s)),
					),
				},
			})
		})
		return this.listGroups(eventId)
	}

	private async lockEvent(tx: MySql2Database, eventId: number): Promise<EventRow> {
		const row = await this.events.lockEvent(tx, eventId)
		if (!row) throw new NotFoundException(`Event ${eventId} not found`)
		return row
	}

	private async lockGroup(
		tx: MySql2Database,
		eventId: number,
		holeId: number,
		startingOrder: number,
	): Promise<RegistrationSlotRow[]> {
		const slots = await this.slots.lockGroup(tx, eventId, holeId, startingOrder)
		if (slots.length === 0) {
			throw new NotFoundException(
				`Event ${eventId} has no slots on hole ${holeId} at starting order ${startingOrder}`,
			)
		}
		return slots
	}

	private async holes(tx: MySql2Database, eventId: number) {
		const courseIds = await this.events.findCourseIds(tx, eventId)
		if (courseIds.length === 0) throw new BadRequestException("Add the event's courses first")
		const holes = await this.slots.findHoles(tx, courseIds)
		const missing = courseIds.filter(
			(id) => !holes.some((h) => h.courseId === id && h.holeNumber === 1),
		)
		if (missing.length > 0) {
			throw new BadRequestException(`Course(s) ${missing.join(", ")} have no hole 1 set up`)
		}
		return holes
	}
}

function requireChoosableSlots(evt: EventRow): void {
	if (!evt.canChoose) {
		throw new BadRequestException("Players do not choose slots in this event")
	}
	if (evt.startType !== StartTypeChoices.TEETIMES && evt.startType !== StartTypeChoices.SHOTGUN) {
		throw new BadRequestException("Slots need a tee-time or shotgun start type")
	}
	if (!evt.groupSize) throw new BadRequestException("Set the event's group size first")
}

function refuseAfterRegistrationOpens(evt: EventRow, action: string): void {
	if (registrationHasOpened(evt)) {
		throw new ConflictException(`Cannot ${action} after registration has opened`)
	}
}

function firstHoles<T extends { holeNumber: number }>(holes: T[]): T[] {
	return holes.filter((h) => h.holeNumber === 1)
}

function group(
	eventId: number,
	holeId: number,
	startingOrder: number,
	size: number,
	status: string,
): NewSlot[] {
	return Array.from({ length: size }, (_, slot) => ({
		eventId,
		holeId,
		startingOrder,
		slot,
		status,
	}))
}

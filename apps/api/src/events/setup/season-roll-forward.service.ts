import {
	BadRequestException,
	ConflictException,
	HttpException,
	Inject,
	Injectable,
} from "@nestjs/common"
import type { MySql2Database } from "drizzle-orm/mysql2"
import {
	EventStatusChoices,
	type EventStatusValue,
	type EventTypeValue,
	type RollForwardCreatedEvent,
	type RollForwardPreview,
	type RollForwardProposal,
	type RollForwardResult,
} from "@repo/domain/types"

import { AuditService, type AuditContext } from "../../audit"
import { DrizzleService, type EventRow } from "../../database"

import { EventSetupRepository } from "./event-setup.repository"
import {
	eventSettingsSchema,
	parseBody,
	rollForwardPreviewSchema,
	rollForwardSchema,
	type EventSettings,
	type RollForwardValues,
} from "./event-setup.schemas"
import { EventSetupService, settingsOf, toEventValues } from "./event-setup.service"
import { daysBetween, proposedDate, proposedName, shiftByClubDays } from "./roll-forward"
import { playersChooseSlots, SlotSetupService } from "./slot-setup.service"

interface PlannedEvent {
	proposal: RollForwardProposal
	source: EventRow
	/** The new event's settings, when they are valid. */
	settings: EventSettings | null
}

/**
 * Season roll-forward: creates next season's events from a source season's, with
 * their courses, event fees, sessions, session fees, and registration slots, in one
 * transaction. Registrations, results, documents, and photos are never copied.
 */
@Injectable()
export class SeasonRollForwardService {
	constructor(
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
		@Inject(EventSetupRepository) private readonly repository: EventSetupRepository,
		@Inject(EventSetupService) private readonly setup: EventSetupService,
		@Inject(SlotSetupService) private readonly slots: SlotSetupService,
		@Inject(AuditService) private readonly audit: AuditService,
	) {}

	/** The events roll-forward would create, each with the issues that would refuse it. */
	async preview(body: unknown): Promise<RollForwardPreview> {
		const values = parseBody(rollForwardPreviewSchema, body)
		const planned = await this.plan(this.drizzle.db, values)
		return {
			fromSeason: values.fromSeason,
			toSeason: values.toSeason,
			events: planned.map((p) => p.proposal),
		}
	}

	/** Creates the events, or refuses them all if any has an issue. */
	async apply(body: unknown, context: AuditContext): Promise<RollForwardResult> {
		const values = parseBody(rollForwardSchema, body)
		const created = await this.drizzle.db.transaction(async (tx) => {
			const planned = await this.plan(tx, values)
			const refused = planned.filter((p) => p.proposal.issues.length > 0)
			if (refused.length > 0) {
				throw new ConflictException(
					refused.map(({ proposal: p }) => `${p.name} (${p.startDate}): ${p.issues.join("; ")}`),
				)
			}

			const created: RollForwardCreatedEvent[] = []
			for (const { proposal, source, settings } of planned) {
				const eventId = await this.repository.insertEvent(tx, toEventValues(settings!))
				await this.setup.copySetup(tx, source.id, eventId)
				const row = await this.repository.findEvent(tx, eventId)
				const slotCount = proposal.createsSlots ? await this.insertSlots(tx, row, proposal) : 0
				await this.audit.record(tx, context, {
					operation: "event.rollforward",
					entityType: "event",
					entityId: eventId,
					eventId,
					before: {},
					after: { ...settingsOf(row), rolledForwardFromEventId: source.id, slotCount },
				})
				created.push({
					sourceEventId: source.id,
					eventId,
					name: row.name,
					startDate: row.startDate,
					slotCount,
				})
			}
			return created
		})
		return { fromSeason: values.fromSeason, toSeason: values.toSeason, created }
	}

	private async plan(db: MySql2Database, values: RollForwardValues): Promise<PlannedEvent[]> {
		const { fromSeason, toSeason } = values
		const sources = new Map(
			(await this.repository.findSeasonEvents(db, fromSeason)).map((e) => [e.id, e]),
		)
		const choices =
			values.events ??
			[...sources.values()].map((s) => ({
				sourceEventId: s.id,
				name: proposedName(s.name, fromSeason, toSeason),
				startDate: proposedDate(s.startDate, fromSeason, toSeason),
			}))

		const seen = new Set<number>()
		for (const { sourceEventId } of choices) {
			if (!sources.has(sourceEventId)) {
				throw new BadRequestException(
					`Event ${sourceEventId} is not an event of the ${fromSeason} season`,
				)
			}
			if (seen.has(sourceEventId)) {
				throw new BadRequestException(`Event ${sourceEventId} is listed more than once`)
			}
			seen.add(sourceEventId)
		}

		// MySQL compares the names, so a match follows the name column's collation, as the
		// unique name + date index does (case-insensitive, and accent-insensitive in some databases).
		const taken = new Set<number>()
		for (const c of choices) {
			if (await this.repository.nameTaken(db, c.name, c.startDate)) taken.add(c.sourceEventId)
		}
		// Within the batch, names are folded at least as leniently as any of those collations.
		const key = (name: string, date: string) => `${foldName(name)}\u0000${date}`
		const batch = new Map<string, number>()
		for (const c of choices) {
			batch.set(key(c.name, c.startDate), (batch.get(key(c.name, c.startDate)) ?? 0) + 1)
		}
		const withCourses = new Set(await this.repository.findEventIdsWithCourses(db, [...seen]))

		return choices
			.map((choice) => {
				const source = sources.get(choice.sourceEventId)!
				const createsSlots = playersChooseSlots(source)
				const issues: string[] = []

				const parsed = eventSettingsSchema.safeParse(
					rolledSettings(source, choice.name, choice.startDate, toSeason),
				)
				if (!parsed.success) {
					issues.push(
						...parsed.error.issues.map((i) =>
							i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message,
						),
					)
				}
				if (taken.has(choice.sourceEventId)) {
					issues.push(`An event named "${choice.name}" already exists on ${choice.startDate}`)
				}
				if ((batch.get(key(choice.name, choice.startDate)) ?? 0) > 1) {
					issues.push(
						`Another event in this roll-forward is named "${choice.name}" on ${choice.startDate}`,
					)
				}
				if (createsSlots && !withCourses.has(source.id)) {
					issues.push("Players choose slots, but the event has no courses to create them on")
				}

				const proposal: RollForwardProposal = {
					sourceEventId: source.id,
					sourceName: source.name,
					sourceStartDate: source.startDate,
					sourceStatus: source.status as EventStatusValue,
					eventType: source.eventType as EventTypeValue,
					name: choice.name,
					startDate: choice.startDate,
					createsSlots,
					issues,
				}
				return { proposal, source, settings: parsed.success ? parsed.data : null }
			})
			.sort(
				(a, b) =>
					a.proposal.startDate.localeCompare(b.proposal.startDate) || a.source.id - b.source.id,
			)
	}

	/** Creates the new event's slots, naming the event if that fails. */
	private async insertSlots(
		tx: MySql2Database,
		row: EventRow,
		proposal: RollForwardProposal,
	): Promise<number> {
		try {
			return await this.slots.insertInitialSlots(tx, row)
		} catch (error) {
			if (!(error instanceof HttpException)) throw error
			throw new BadRequestException(
				`${proposal.name} (${proposal.startDate}): cannot create slots: ${error.message}`,
			)
		}
	}
}

/** A name without case, accents, or trailing spaces, for comparing names the way MySQL does. */
function foldName(name: string): string {
	return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trimEnd()
}

/**
 * The source event's settings for the new event: in the target season, on the new date,
 * Scheduled, without its portal and external URLs (the Golf Genius ID is not a setting, so
 * it is never copied). Signup, priority signup, and payments end keep their offsets from
 * the event date, at the same club time.
 */
function rolledSettings(
	source: EventRow,
	name: string,
	startDate: string,
	toSeason: number,
): Record<string, unknown> {
	const s = settingsOf(source)
	const days = daysBetween(source.startDate, startDate)
	const shift = (field: string) => shiftByClubDays(s[field] as string | null, days)
	return {
		...s,
		name,
		startDate,
		season: toSeason,
		status: EventStatusChoices.SCHEDULED,
		portalUrl: null,
		externalUrl: null,
		prioritySignupStart: shift("prioritySignupStart"),
		signupStart: shift("signupStart"),
		signupEnd: shift("signupEnd"),
		paymentsEnd: shift("paymentsEnd"),
	}
}

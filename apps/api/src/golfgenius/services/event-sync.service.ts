import { Inject, Injectable, Logger } from "@nestjs/common"

import { CoursesService } from "../../courses"
import { EventsRepository } from "../../events"
import { ApiClient } from "../api-client"

interface EventSyncSummary {
	eventUpdated: boolean
	roundsCreated: number
	roundsUpdated: number
	tournamentsCreated: number
	tournamentsUpdated: number
	errors: string[]
	warnings: string[]
}

interface CourseSyncSummary {
	coursesUpdated: number
	teesUpdated: number
	holesUpdated: number
}

@Injectable()
export class EventSyncService {
	private readonly logger = new Logger(EventSyncService.name)

	constructor(
		@Inject(ApiClient) private readonly apiClient: ApiClient,
		@Inject(EventsRepository) private readonly events: EventsRepository,
		@Inject(CoursesService) private readonly courses: CoursesService,
	) {}

	/**
	 * Synchronize a single local event with Golf Genius data.
	 * Returns a summary of created/updated records.
	 */
	async syncEvent(eventId: number): Promise<EventSyncSummary> {
		const summary: EventSyncSummary = {
			eventUpdated: false,
			roundsCreated: 0,
			roundsUpdated: 0,
			tournamentsCreated: 0,
			tournamentsUpdated: 0,
			errors: [],
			warnings: [],
		}

		// 1) Load our event
		const localEvent = await this.events.findEventById(eventId)
		if (!localEvent) throw new Error(`Local event not found: ${eventId}`)
		const localEventId = localEvent.id

		// 2) Find matching GG event
		const ggEvent = await this.apiClient.findMatchingEventByStartDate(
			localEvent.startDate,
			localEvent.name,
		)
		if (!ggEvent || !ggEvent.id) throw new Error("Matched Golf Genius event missing id")

		const ggEventId = ggEvent.id

		// 3) Update our event with gg_id and portal_url (prepend https:// if missing)
		const portal = ggEvent.website ?? null
		const portalUrl =
			portal && !portal.toString().startsWith("http")
				? `https://${portal.toString().replace(/^\/+/, "")}`
				: portal

		localEvent.ggId = ggEventId
		localEvent.portalUrl = portalUrl!
		await this.events.updateEvent(localEventId, localEvent)

		summary.eventUpdated = true

		// 4) Upsert rounds by ggId so child rows (event_pairings, results, points) survive a re-sync.
		const existingRounds = await this.events.findRoundsByEventId(localEventId)
		const existingRoundsByGgId = new Map(existingRounds.map((r) => [r.ggId, r]))

		const ggRounds = await this.apiClient.getEventRounds(ggEventId)
		const ggRoundIdToLocalId: Record<string, number> = {}
		for (const gr of ggRounds) {
			const existing = existingRoundsByGgId.get(gr.id)
			if (existing) {
				await this.events.updateRound(existing.id, {
					roundNumber: gr.index,
					roundDate: gr.date,
					ggId: gr.id,
				})
				ggRoundIdToLocalId[gr.id] = existing.id
				summary.roundsUpdated += 1
			} else {
				const created = await this.events.createRound({
					roundNumber: gr.index,
					roundDate: gr.date,
					ggId: gr.id,
					eventId: localEventId,
				})
				if (created && created.id) {
					ggRoundIdToLocalId[gr.id] = created.id
					summary.roundsCreated += 1
				}
			}
		}

		// 5) Upsert tournaments.
		//
		// Golf Genius quirks this has to survive:
		// - A multi-round tournament (e.g. a 2-day total) is listed under every round
		//   with the same tournament id. It must map to ONE local row (first round wins).
		// - Golf Genius recreates tournaments with a brand-new id when their setup
		//   changes mid-event (e.g. flighting after round 1), sometimes renaming them.
		//   The tournament_spec_id survives recreation, so match ggId → name → specId
		//   and refresh the stored ids on every match.
		const existingTournaments = await this.events.findTournamentsByEventId(localEventId)
		const claimedLocalIds = new Set<number>()
		const seenGgIds = new Set<string>()

		for (const gr of ggRounds) {
			const localRoundId = ggRoundIdToLocalId[String(gr.id)]
			if (!localRoundId) {
				this.logger.warn("No local round found for gg round", String(gr.id))
				continue
			}
			const ggTournaments = await this.apiClient.getRoundTournaments(ggEventId, String(gr.id))
			for (const gt of ggTournaments) {
				// A tournament already handled under an earlier round keeps that binding.
				if (seenGgIds.has(gt.id)) continue
				seenGgIds.add(gt.id)

				// Gross/net variants of a flighted tournament can both report a "net"
				// handicap_format, so the name is the more reliable signal.
				const nameLower = gt.name.toLowerCase()
				const isNet = nameLower.includes("gross")
					? false
					: nameLower.includes("net") || gt.handicap_format.toLowerCase().includes("net")
				const isPoints = nameLower.includes("points")
				const data = {
					name: gt.name,
					format: isPoints ? "points" : gt.score_format.toLowerCase(),
					isNet: isNet ? 1 : 0,
					ggId: gt.id,
					ggSpecId: gt.tournament_spec_id ?? null,
					eventId: localEventId,
					roundId: localRoundId,
				}

				const existing = this.findMatchingTournament(gt, existingTournaments, claimedLocalIds)
				try {
					if (existing) {
						claimedLocalIds.add(existing.id)
						await this.events.updateTournament(existing.id, data)
						summary.tournamentsUpdated += 1
					} else {
						const created = await this.events.createTournament(data)
						if (created && created.id) claimedLocalIds.add(created.id)
						summary.tournamentsCreated += 1
					}
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					summary.errors.push(`Failed to sync tournament "${gt.name}": ${message}`)
					this.logger.error(`Failed to sync tournament "${gt.name}"`, message)
				}
			}
		}

		// Local tournaments Golf Genius no longer reports (stale ids from recreated
		// tournaments). Not deleted automatically because results may hang off them.
		for (const t of existingTournaments) {
			if (!claimedLocalIds.has(t.id)) {
				summary.warnings.push(
					`Local tournament "${t.name}" (ggId ${t.ggId}) was not found in Golf Genius`,
				)
			}
		}

		return summary
	}

	/**
	 * Find the local tournament that corresponds to a Golf Genius tournament.
	 * Match order: ggId (normal case), then name (recreated with a new id),
	 * then tournament_spec_id (recreated AND renamed). Rows already claimed
	 * by another tournament in this sync run are never matched again.
	 */
	private findMatchingTournament(
		gt: { id: string; name: string; tournament_spec_id?: string | null },
		existingTournaments: { id: number; name: string; ggId: string; ggSpecId: string | null }[],
		claimedLocalIds: Set<number>,
	): { id: number; name: string; ggId: string; ggSpecId: string | null } | undefined {
		const unclaimed = existingTournaments.filter((t) => !claimedLocalIds.has(t.id))

		const byGgId = unclaimed.find((t) => t.ggId === gt.id)
		if (byGgId) return byGgId

		const byName = unclaimed.find((t) => t.name === gt.name)
		if (byName) return byName

		// Spec ids are shared by gross/net views of the same tournament, so only
		// match when exactly one candidate remains.
		if (gt.tournament_spec_id) {
			const bySpecId = unclaimed.filter((t) => t.ggSpecId === gt.tournament_spec_id)
			if (bySpecId.length === 1) return bySpecId[0]
		}

		return undefined
	}

	/**
	 * Synchronize course, tee, and hole data from Golf Genius.
	 * Returns a summary of updated records.
	 */
	async syncCourses(eventId: number): Promise<CourseSyncSummary> {
		const summary: CourseSyncSummary = {
			coursesUpdated: 0,
			teesUpdated: 0,
			holesUpdated: 0,
		}

		// Load event to get ggId
		const localEvent = await this.events.findEventById(eventId)
		if (!localEvent) throw new Error(`Local event not found: ${eventId}`)
		if (!localEvent.ggId) throw new Error(`Event ${eventId} has no ggId - run syncEvent first`)

		// Get courses linked to this event (may be empty for non-choose events
		// that don't pre-assign courses via the event_courses junction table).
		const linkedCourses = await this.courses.findCoursesByEventId({ eventId })

		// Fetch GG courses
		const ggCourses = await this.apiClient.getEventCourses(localEvent.ggId)

		for (const ggCourse of ggCourses) {
			// Prefer an event-linked match; fall back to a global name lookup
			// so non-choose events still sync course/tee/hole data.
			let localCourse = linkedCourses.find(
				(c) => c.name.toLowerCase() === ggCourse.name.toLowerCase(),
			)
			if (!localCourse) {
				const fallback = await this.courses.findCourseByName(ggCourse.name)
				if (fallback) localCourse = fallback
			}
			if (!localCourse) {
				this.logger.warn(`No local course matches GG course "${ggCourse.name}"`)
				continue
			}

			// Update course ggId
			await this.courses.updateCourseGgId(localCourse.id, ggCourse.id)
			summary.coursesUpdated += 1

			// Sync tees
			for (const ggTee of ggCourse.tees) {
				await this.courses.upsertTee(localCourse.id, ggTee.name, ggTee.id)
				summary.teesUpdated += 1
			}

			// Find White tee for hole par values
			const whiteTee = ggCourse.tees.find((t) => t.name.toLowerCase() === "white")
			if (!whiteTee) {
				this.logger.warn(`No "White" tee found for course "${ggCourse.name}" - skipping holes`)
				continue
			}

			// Sync holes using White tee's par values
			const parValues = whiteTee.hole_data.par
			for (let i = 0; i < parValues.length; i++) {
				const par = parValues[i]
				if (par !== null) {
					await this.courses.upsertHole(localCourse.id, i + 1, par)
					summary.holesUpdated += 1
				}
			}
		}

		return summary
	}
}

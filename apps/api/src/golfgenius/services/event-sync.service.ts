import { Inject, Injectable, Logger } from "@nestjs/common"

import { CoursesService } from "../../courses"
import { TournamentRow } from "../../database"
import { EventsRepository } from "../../events"
import { ApiClient } from "../api-client"

interface EventSyncSummary {
	eventUpdated: boolean
	roundsCreated: number
	tournamentsCreated: number
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
		const summary = {
			eventUpdated: false,
			roundsCreated: 0,
			tournamentsCreated: 0,
		}

		// 1) Load our event
		let localEventId: number
		const localEvent = await this.events.findEventById(eventId)
		if (!localEvent) throw new Error(`Local event not found: ${eventId}`)
		localEventId = localEvent.id

		// 2) Find matching GG event
		const ggEvent = await this.apiClient.findMatchingEventByStartDate(
			localEvent.startDate,
			localEvent.name,
		)
		if (!ggEvent || !ggEvent.id) throw new Error("Matched Golf Genius event missing id")

		const ggEventId = ggEvent.id

		// 3) Delete existing tournaments and rounds by event id (bulk deletes to respect FK)
		// First delete child records (results & points) for each tournament to avoid FK constraint errors.
		const existingTournaments = await this.events.findTournamentsByEventId(localEventId)
		for (const t of existingTournaments) {
			if (t && t.id) {
				// Ensure child rows removed before deleting parent tournament
				await this.events.deleteTournamentResults(t.id)
				await this.events.deleteTournamentPoints(t.id)
			}
		}
		await this.events.deleteTournamentsByEventId(localEventId)
		await this.events.deleteRoundsByEventId(localEventId)

		// 4) Update our event with gg_id and portal_url (prepend https:// if missing)
		const portal = ggEvent.website ?? ggEvent.website ?? null
		const portalUrl =
			portal && !portal.toString().startsWith("http")
				? `https://${portal.toString().replace(/^\/+/, "")}`
				: portal

		localEvent.ggId = ggEventId
		localEvent.portalUrl = portalUrl!
		await this.events.updateEvent(localEventId, localEvent)

		summary.eventUpdated = true

		const ggRounds = await this.apiClient.getEventRounds(ggEventId)
		const ggRoundIdToLocalId: Record<string, number> = {}
		for (const gr of ggRounds) {
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

		for (const gr of ggRounds) {
			const localRoundId = ggRoundIdToLocalId[String(gr.id)]
			if (!localRoundId) {
				this.logger.warn("No local round found for gg round", String(gr.id))
				continue
			}
			const ggTournaments = await this.apiClient.getRoundTournaments(ggEventId, String(gr.id))
			for (const gt of ggTournaments) {
				const isNet = gt.handicap_format.toLowerCase().includes("net")
				const isPoints = gt.name.toLowerCase().includes("points")
				const created = await this.events.createTournament({
					name: gt.name ?? undefined,
					format: isPoints ? "points" : gt.score_format.toLowerCase(),
					isNet: isNet ? 1 : 0,
					ggId: gt.id,
					eventId: localEventId,
					roundId: localRoundId,
				} as TournamentRow)
				if (created && created.id) summary.tournamentsCreated += 1
			}
		}

		return summary
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

		// Get courses for this event
		const localCourses = await this.courses.findCoursesByEventId({ eventId })
		if (localCourses.length === 0) {
			this.logger.warn(`No courses found for event ${eventId}`)
			return summary
		}

		// Fetch GG courses
		const ggCourses = await this.apiClient.getEventCourses(localEvent.ggId)

		for (const ggCourse of ggCourses) {
			// Find matching local course by case-insensitive name
			const localCourse = localCourses.find(
				(c) => c.name.toLowerCase() === ggCourse.name.toLowerCase(),
			)
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

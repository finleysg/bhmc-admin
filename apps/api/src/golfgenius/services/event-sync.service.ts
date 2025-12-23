import { Injectable, Logger } from "@nestjs/common"

import { TournamentRow } from "../../database"
import { EventsRepository } from "../../events"
import { ApiClient } from "../api-client"

interface EventSyncSummary {
	eventUpdated: boolean
	roundsCreated: number
	tournamentsCreated: number
}

@Injectable()
export class EventSyncService {
	private readonly logger = new Logger(EventSyncService.name)

	constructor(
		private readonly apiClient: ApiClient,
		private readonly events: EventsRepository,
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
		localEventId = localEvent.id!

		// 2) Find matching GG event
		const ggEvent = await this.apiClient.findMatchingEventByStartDate(
			localEvent.startDate,
			localEvent.name,
		)
		if (!ggEvent || !ggEvent.id) throw new Error("Matched Golf Genius event missing id")

		const ggEventId = ggEvent.id.toString()

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
				const isNet = (gt.handicapFormat ?? "").toString().toLowerCase().includes("net")
				const created = await this.events.createTournament({
					name: gt.name ?? undefined,
					format: gt.scoreFormat ?? undefined,
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
}

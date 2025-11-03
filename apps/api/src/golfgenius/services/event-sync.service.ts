import { Injectable, Logger } from "@nestjs/common"

import { EventsService } from "../../events/events.service"
import { ApiClient } from "../api-client"

@Injectable()
export class EventSyncService {
	private readonly logger = new Logger(EventSyncService.name)

	constructor(
		private readonly apiClient: ApiClient,
		private readonly eventsService: EventsService,
	) {}

	/**
	 * Synchronize a single local event with Golf Genius data.
	 * Returns a summary of created/updated records.
	 */
	async syncEvent(eventId: number) {
		const summary = {
			eventUpdated: false,
			roundsCreated: 0,
			tournamentsCreated: 0,
		}

		// 1) Load our event
		let localEventId: number
		const localEvent = await this.eventsService.findEventById(eventId)
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
		await this.eventsService.deleteTournamentsByEventId(localEventId)
		await this.eventsService.deleteRoundsByEventId(localEventId)

		// 4) Update our event with gg_id and portal_url (prepend https:// if missing)
		const portal = ggEvent.website ?? ggEvent.website ?? null
		const portalUrl =
			portal && !portal.toString().startsWith("http")
				? `https://${portal.toString().replace(/^\/+/, "")}`
				: portal
		await this.eventsService.updateEvent(localEventId, {
			ggId: ggEventId,
			portalUrl: portalUrl,
		})
		summary.eventUpdated = true

		const ggRounds = await this.apiClient.getEventRounds(ggEventId)
		const ggRoundIdToLocalId: Record<string, number> = {}
		for (const gr of ggRounds) {
			const created = await this.eventsService.createRound({
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
				const isNet = (gt.handicapFormat ?? "").toString().toLowerCase().includes("net") ? 1 : 0
				const created = await this.eventsService.createTournament({
					name: gt.name ?? undefined,
					format: gt.scoreFormat ?? undefined,
					isNet,
					ggId: gt.id,
					eventId: localEventId,
					roundId: localRoundId,
				})
				if (created && created.id) summary.tournamentsCreated += 1
			}
		}

		return summary
	}
}

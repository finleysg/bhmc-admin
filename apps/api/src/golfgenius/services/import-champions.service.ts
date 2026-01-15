import { Inject, Injectable, Logger } from "@nestjs/common"

import { CoreService, mapTournamentWinnerToChampionInsert } from "../../core"
import { EventsService } from "../../events"

// Internal DTO for import result
export interface ImportChampionsResult {
	championsCreated: number
	errors: string[]
}

@Injectable()
export class ImportChampionsService {
	private readonly logger = new Logger(ImportChampionsService.name)

	constructor(
		@Inject(CoreService) private readonly coreRepository: CoreService,
		@Inject(EventsService) private readonly eventsService: EventsService,
	) {}

	async importChampions(eventId: number): Promise<ImportChampionsResult> {
		this.logger.log(`Starting champion import for event ${eventId}`)

		// Get validated event (ensures event exists, has ggId, etc.)
		const event = await this.eventsService.getCompleteClubEventById(eventId)

		this.logger.log(`Processing champions for event: ${event.name}`)

		// Ensure idempotency: Delete existing champions for this event
		await this.coreRepository.deleteChampions(eventId)
		this.logger.log(`Deleted existing champions for event ${eventId}`)

		let championsCreated = 0
		const errors: string[] = []

		// Get all tournaments for the event (already validated)
		for (const localTournament of event.tournaments) {
			const format = localTournament.format?.toLowerCase()
			if (!this.isSupportedFormat(format)) {
				this.logger.debug(`Skipping unsupported format: ${format}`)
				continue
			}

			this.logger.log(`Processing ${format} tournament: ${localTournament.name}`)

			try {
				// Find first place winners from local tournament results
				const winners = await this.eventsService.findTournamentWinners(localTournament.id)
				for (const winner of winners) {
					const champion = mapTournamentWinnerToChampionInsert(
						winner,
						localTournament.isNet,
						eventId,
						event.season,
						event.name,
					)
					await this.coreRepository.createChampion(champion)
					this.logger.log(
						`Created champion for player ${winner.player?.firstName} ${winner.player?.lastName} in flight ${champion.flight}`,
					)
					championsCreated += 1
				}
			} catch (error) {
				const errorMessage = `Error processing tournament ${localTournament.name} (ID: ${localTournament.id}): ${error instanceof Error ? error.message : String(error)}`
				this.logger.error(errorMessage)
				errors.push(errorMessage)
				// Continue with other tournaments
			}
		}

		this.logger.log(
			`Champion import complete: ${championsCreated} champions created, ${errors.length} errors`,
		)
		return { championsCreated, errors }
	}

	private isSupportedFormat(format: string | undefined): boolean {
		if (!format) return false
		return ["stroke", "quota", "team"].includes(format)
	}
}

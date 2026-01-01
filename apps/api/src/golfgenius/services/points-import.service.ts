import { Observable, Subject } from "rxjs"

import { Injectable, Logger } from "@nestjs/common"
import {
	IntegrationActionName,
	PlayerMap,
	PlayerRecord,
	PreparedTournamentPoints,
	PlayerProgressEvent,
	TournamentProgressEvent,
	TournamentData,
} from "@repo/domain/types"

import { EventsService } from "../../events/events.service"
import { AdminRegistrationService } from "../../registration/services/admin-registration.service"
import { ApiClient } from "../api-client"
import { ImportResult, toTournamentData } from "../dto"
import { ProgressTracker } from "./progress-tracker"
import { PointsResultParser } from "./result-parsers"
import { toDbString } from "../../database"
import { GgAggregate, GgScope, GgTournamentResult, PointsTournamentAggregate } from "../api-data"

export interface PointsImportSummary {
	tournamentId: number
	tournamentName: string
	eventName: string
	pointsImported: number
	errors: string[]
}

@Injectable()
export class PointsImportService {
	private readonly logger = new Logger(PointsImportService.name)

	constructor(
		private readonly apiClient: ApiClient,
		private readonly progressTracker: ProgressTracker,
		private readonly eventsService: EventsService,
		private readonly registrationService: AdminRegistrationService,
	) {}

	// ============= PUBLIC METHODS =============

	async importPointsResults(eventId: number): Promise<PointsImportSummary[]> {
		return this.importPointsByFormat(eventId, "points", this.processPointsResults.bind(this))
	}

	// ============= STREAMING METHODS =============

	async importPointsResultsStream(eventId: number): Promise<Observable<TournamentProgressEvent>> {
		return this.importPointsByFormatStream(
			eventId,
			"points",
			"Import Points",
			this.processPointsResults.bind(this),
		)
	}

	getProgressObservable(
		eventId: number,
	): Subject<PlayerProgressEvent | TournamentProgressEvent> | null {
		return this.progressTracker.getProgressObservable(eventId)
	}

	// ============= STREAMING HELPER METHODS =============

	private async importPointsByFormatStream(
		eventId: number,
		format: string,
		actionName: string,
		processor: (
			tournamentData: TournamentData,
			result: PointsImportSummary,
			ggResults: GgTournamentResult,
			playerMap: PlayerMap,
			onPlayerProcessed?: (success: boolean, playerName?: string) => void,
		) => Promise<void>,
	): Promise<Observable<TournamentProgressEvent>> {
		// Query tournaments for the specified format
		const clubEvent = await this.eventsService.getCompleteClubEventById(eventId)
		const tournaments = clubEvent.tournaments.filter((t) => t.format === format)

		if (tournaments.length === 0) {
			throw new Error(`No ${format} tournaments found for event ${eventId}`)
		}

		// Start tracking progress with tournament count
		const totalTournaments = tournaments.length
		const progressObservable = this.progressTracker.startTournamentTracking(
			eventId,
			totalTournaments,
		) as Observable<TournamentProgressEvent>

		void (async () => {
			const result: ImportResult = {
				eventId,
				actionName,
				totalProcessed: 0,
				created: 0,
				updated: 0,
				skipped: 0,
				errors: [],
			}

			let processedTournaments = 0

			// Create callback for per-tournament progress updates
			const onTournamentProcessed = (success: boolean, tournamentName?: string) => {
				processedTournaments++
				this.progressTracker.emitTournamentProgress(eventId, {
					totalTournaments,
					processedTournaments,
					status: processedTournaments >= totalTournaments ? "complete" : "processing",
					message: success
						? `Processed ${tournamentName || "tournament"} (${processedTournaments}/${totalTournaments})`
						: `Skipped ${tournamentName || "tournament"} (${processedTournaments}/${totalTournaments})`,
				})
			}

			try {
				for (let i = 0; i < tournaments.length; i++) {
					const t = tournaments[i]

					this.progressTracker.emitTournamentProgress(eventId, {
						totalTournaments,
						processedTournaments,
						status: "processing",
						message: `Processing tournament ${i + 1} of ${totalTournaments}: ${t.name}...`,
					})

					const tournamentData = toTournamentData(t, clubEvent)
					const tournamentResult = await this.importTournamentPoints(
						tournamentData,
						processor,
						undefined, // No per-player progress for streaming
						onTournamentProcessed, // Tournament completion callback
					)

					// Aggregate results
					result.created += tournamentResult.pointsImported
					result.totalProcessed += tournamentResult.pointsImported

					// Convert errors to ImportError format
					result.errors.push(
						...tournamentResult.errors.map((error) => ({
							itemId: t.id?.toString(),
							itemName: t.name,
							error,
						})),
					)
				}

				// Complete the operation
				await this.progressTracker.completeOperation(eventId, result)
			} catch (error) {
				await this.progressTracker.errorOperation(
					eventId,
					actionName as IntegrationActionName,
					(error as Error).message,
				)
			}
		})()

		return progressObservable
	}

	// ============= PRIVATE HELPER METHODS =============

	private async importPointsByFormat(
		eventId: number,
		format: string,
		processor: (
			tournamentData: TournamentData,
			result: PointsImportSummary,
			ggResults: GgTournamentResult,
			playerMap: PlayerMap,
		) => Promise<void>,
	): Promise<PointsImportSummary[]> {
		const clubEvent = await this.eventsService.getCompleteClubEventById(eventId)
		const tournaments = clubEvent.tournaments.filter((t) => t.format === format)

		if (tournaments.length === 0) {
			this.logger.log("No " + format + " tournaments found for event", { eventId })
			return []
		}

		const results: PointsImportSummary[] = []

		for (const t of tournaments) {
			const tournamentData = toTournamentData(t, clubEvent)
			const result = await this.importTournamentPoints(tournamentData, processor)
			results.push(result)
		}

		return results
	}

	private async fetchPlayerMapForEvent(eventId: number): Promise<PlayerMap> {
		return this.registrationService.getPlayerMapForEvent(eventId)
	}

	private resolvePlayerFromMap(
		memberId: string,
		playerMap: PlayerMap,
		result: PointsImportSummary,
	): PlayerRecord | null {
		const player = playerMap.get(memberId)
		if (!player) {
			result.errors.push(`No player found for id ${memberId}`)
			return null
		}
		return player
	}

	private async importTournamentPoints(
		tournamentData: TournamentData,
		processor: (
			tournamentData: TournamentData,
			result: PointsImportSummary,
			ggResults: GgTournamentResult,
			playerMap: PlayerMap,
			onPlayerProcessed?: (success: boolean, playerName?: string) => void,
		) => Promise<void>,
		onPlayerProcessed?: (success: boolean, playerName?: string) => void,
		onTournamentComplete?: (success: boolean, tournamentName: string) => void,
	): Promise<PointsImportSummary> {
		const result: PointsImportSummary = {
			tournamentId: tournamentData.id,
			tournamentName: tournamentData.name,
			eventName: "", // Will be populated when we fetch event
			pointsImported: 0,
			errors: [],
		}

		try {
			// Validate tournament has GG IDs
			if (!this.validateTournament(tournamentData, result)) {
				return result
			}

			// Fetch player map for this event (optimization: single query instead of N+1)
			const playerMap = await this.fetchPlayerMapForEvent(tournamentData.eventId)

			// Delete existing points (idempotent)
			await this.eventsService.deleteTournamentPoints(tournamentData.id)

			// Fetch results from Golf Genius
			const ggResults = await this.fetchGGResults(tournamentData, result)
			if (!ggResults) {
				this.logger.warn("Inconceivable! No results returned from Golf Genius", {
					tournamentId: tournamentData.id,
				})
				return result
			}

			// Process results using the provided processor
			await processor(tournamentData, result, ggResults, playerMap, onPlayerProcessed)

			// Call tournament completion callback on success
			onTournamentComplete?.(true, tournamentData.name)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			result.errors.push(`Unexpected error: ${errorMessage}`)
			this.logger.error("Unexpected error importing points", {
				tournamentId: tournamentData.id,
				error: errorMessage,
			})

			// Call tournament completion callback on failure
			onTournamentComplete?.(false, tournamentData.name)
		}

		return result
	}

	private validateTournament(tournamentData: TournamentData, result: PointsImportSummary): boolean {
		if (!tournamentData.ggId) {
			result.errors.push("Tournament must be synced with Golf Genius first")
			return false
		}
		// Add validation for event.gg_id and round.gg_id if needed
		return true
	}

	private async fetchGGResults(
		tournamentData: TournamentData,
		result: PointsImportSummary,
	): Promise<GgTournamentResult | null> {
		try {
			if (!tournamentData.eventGgId) {
				result.errors.push("Tournament event GG ID is missing")
				return null
			}
			return await this.apiClient.getTournamentResults(
				tournamentData.eventGgId,
				tournamentData.roundGgId,
				tournamentData.ggId,
			)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			result.errors.push(`Failed to fetch from Golf Genius: ${errorMessage}`)
			return null
		}
	}

	private async processResults<T extends GgAggregate>(
		tournamentData: TournamentData,
		result: PointsImportSummary,
		ggResults: GgTournamentResult,
		playerMap: PlayerMap,
		parser: {
			validateResponse: (ggResults: GgTournamentResult) => string | null
			extractScopes: (ggResults: GgTournamentResult) => GgScope[]
			extractFlightName: (scope: GgScope) => string
			extractAggregates: (scope: GgScope) => GgAggregate[]
		},
		prepareRecord: (
			tournamentData: TournamentData,
			aggregate: T,
			flightName: string,
			result: PointsImportSummary,
			playerMap: PlayerMap,
		) => PreparedTournamentPoints | null,
		onPlayerProcessed?: (success: boolean, playerName?: string) => void,
	): Promise<void> {
		// Validate response structure
		const error = parser.validateResponse(ggResults)
		if (error) {
			result.errors.push(error)
			return
		}

		// Extract scopes (flights/divisions)
		const scopes = parser.extractScopes(ggResults)

		const preparedRecords: PreparedTournamentPoints[] = []

		// Process each scope
		for (const scope of scopes) {
			const flightName = parser.extractFlightName(scope)
			const aggregates = parser.extractAggregates(scope)

			// Process each player result
			for (const aggregate of aggregates) {
				let success = false
				const playerName = aggregate.name || "Unknown Player"

				try {
					const preparedRecord = prepareRecord(
						tournamentData,
						aggregate as T,
						flightName,
						result,
						playerMap,
					)
					if (preparedRecord) {
						preparedRecords.push(preparedRecord)
						success = true
					}
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error)
					result.errors.push(`Error processing player result: ${errorMessage}`)
					this.logger.error("Error processing player result", {
						tournamentId: tournamentData.id,
						error: errorMessage,
					})
				}

				// Call the callback after processing each player
				onPlayerProcessed?.(success, playerName)
			}
		}

		// Batch insert all prepared records
		if (preparedRecords.length > 0) {
			await this.eventsService.insertTournamentPoints(preparedRecords)
			result.pointsImported += preparedRecords.length
		}
	}

	// ============= FORMAT-SPECIFIC PROCESSORS =============

	private async processPointsResults(
		tournamentData: TournamentData,
		result: PointsImportSummary,
		ggResults: GgTournamentResult,
		playerMap: PlayerMap,
		onPlayerProcessed?: (success: boolean, playerName?: string) => void,
	): Promise<void> {
		return this.processResults<PointsTournamentAggregate>(
			tournamentData,
			result,
			ggResults,
			playerMap,
			PointsResultParser,
			this.preparePointsRecord.bind(this),
			onPlayerProcessed,
		)
	}

	private preparePointsRecord(
		tournamentData: TournamentData,
		aggregate: PointsTournamentAggregate,
		flightName: string,
		result: PointsImportSummary,
		playerMap: PlayerMap,
	): PreparedTournamentPoints | null {
		// Extract member cards and get first member card
		const memberCards = PointsResultParser.extractMemberCards(aggregate as GgAggregate)
		if (!memberCards || memberCards.length === 0) {
			result.errors.push(`No member cards found for aggregate ${aggregate.name || "Unknown"}`)
			return null
		}
		const memberId = memberCards[0].member_id_str

		// Parse player data using parser
		const playerData = PointsResultParser.parsePlayerData(aggregate, memberCards[0])

		// Resolve player using pre-fetched player map
		const player = this.resolvePlayerFromMap(memberId, playerMap, result)
		if (!player) {
			this.logger.warn("No player found for member ID", { memberId })
			return null
		}

		// Parse points - skip if no points awarded
		const points = Math.round(parseFloat(playerData.points || "0"))
		if (points <= 0) {
			this.logger.log("No points awarded to player, skipping", {
				playerId: player.id,
				playerData: JSON.stringify(playerData),
			})
			return null // Skip players who didn't earn points
		}

		// Parse position from rank attribute
		const rankStr = playerData.rank
		let position = 0
		try {
			position = rankStr && rankStr.trim() !== "" ? parseInt(rankStr, 10) : 0
		} catch {
			position = 0
		}

		// Parse score (total strokes) if available
		const totalStr = playerData.total
		let score: number | null = null
		try {
			score = totalStr && totalStr.trim() !== "" ? parseInt(totalStr, 10) : null
		} catch (e: unknown) {
			this.logger.warn("Failed to parse score for player", {
				playerId: player.id,
				totalStr,
				error: String(e),
			})
			score = null
		}

		// Build details string
		const positionDetails = PointsResultParser.formatPositionDetails(playerData.position)
		const details = `${tournamentData.name}${flightName ? " - " : ""}${flightName ?? ""}: ${positionDetails}`

		// Return prepared data instead of inserting
		return {
			tournamentId: tournamentData.id,
			playerId: player.id,
			position,
			score,
			points,
			details,
			createDate: toDbString(new Date()),
		}
	}
}

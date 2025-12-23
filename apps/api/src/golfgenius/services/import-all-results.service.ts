import { Observable, Subject } from "rxjs"

import { Injectable, Logger } from "@nestjs/common"
import {
	PlayerMap,
	PlayerRecord,
	PreparedTournamentResult,
	PlayerProgressEvent,
	TournamentProgressEvent,
	TournamentData,
} from "@repo/domain/types"

import { EventsService } from "../../events/events.service"
import { RegistrationService } from "../../registration/registration.service"
import { ApiClient } from "../api-client"
import { ImportResult } from "../dto"
import { toTournamentData } from "../dto/mappers"
import { ImportResultSummary } from "../dto/results.dto"
import {
	GGAggregate,
	GGScope,
	GolfGeniusTournamentResults,
	ProxyTournamentAggregate,
	QuotaTournamentAggregate,
	SkinsTournamentAggregate,
	StrokeTournamentAggregate,
} from "../dto/tournament-results.dto"
import { ProgressTracker } from "./progress-tracker"
import {
	ProxyResultParser,
	QuotaResultParser,
	SkinsResultParser,
	StrokePlayResultParser,
} from "./result-parsers"
import { TeamResultParser } from "./team-result-parser"
import { parsePurseAmount } from "./utils"
import { toDbString } from "../../database"

@Injectable()
export class ImportAllResultsService {
	private readonly logger = new Logger(ImportAllResultsService.name)

	constructor(
		private readonly apiClient: ApiClient,
		private readonly progressTracker: ProgressTracker,
		private readonly eventsService: EventsService,
		private readonly registrationService: RegistrationService,
	) {}

	// ============= PUBLIC METHODS =============

	async importAllResultsStream(eventId: number): Promise<Observable<TournamentProgressEvent>> {
		const clubEvent = await this.eventsService.getValidatedClubEventById(eventId)
		const tournaments = clubEvent.tournaments.filter((t) => t.name !== "Overall")

		if (tournaments.length === 0) {
			throw new Error(`No tournaments found for event ${eventId}`)
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
				actionName: "Import Results",
				totalProcessed: 0,
				created: 0,
				updated: 0,
				skipped: 0,
				errors: [],
			}

			let processedTournaments = 0

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
					const tournamentResult = await this.importTournamentResults(
						tournamentData,
						this.selectProcessor(t.format),
						undefined, // No per-player progress for streaming
						(success, tournamentName) => {
							processedTournaments++
							this.progressTracker.emitTournamentProgress(eventId, {
								totalTournaments,
								processedTournaments,
								status: processedTournaments >= totalTournaments ? "complete" : "processing",
								message: success
									? `Processed ${tournamentName} (${processedTournaments}/${totalTournaments})`
									: `Skipped ${tournamentName} (${processedTournaments}/${totalTournaments})`,
							})
						}, // Tournament completion callback
					)

					// Aggregate results
					result.created += tournamentResult.resultsImported
					result.totalProcessed += tournamentResult.resultsImported

					// Convert errors to ImportError format
					result.errors.push(
						...tournamentResult.errors.map((error: string) => ({
							itemId: t.id?.toString() ?? "",
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
					"Import Results",
					(error as Error).message,
				)
			}
		})()

		return progressObservable
	}

	getProgressObservable(
		eventId: number,
	): Subject<PlayerProgressEvent | TournamentProgressEvent> | null {
		return this.progressTracker.getProgressObservable(eventId)
	}

	private selectProcessor(
		format: string,
	): (
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: GolfGeniusTournamentResults,
		playerMap: PlayerMap,
		onPlayerProcessed?: (success: boolean, playerName?: string) => void,
	) => Promise<void> {
		switch (format) {
			case "skins":
				return this.processSkinsResults.bind(this)
			case "user_scored":
				return this.processProxyResults.bind(this)
			case "stroke":
				return this.processStrokeResults.bind(this)
			case "team":
				return this.processTeamResults.bind(this)
			case "quota":
				return this.processQuotaResults.bind(this)
			default:
				this.logger.debug(`Format ${format} is not handled by Import Results process.`)
				return async () => {
					// Do nothing
				}
		}
	}

	// ============= PRIVATE HELPER METHODS =============

	private async importTournamentResults(
		tournamentData: TournamentData,
		processor: (
			tournamentData: TournamentData,
			result: ImportResultSummary,
			ggResults: GolfGeniusTournamentResults,
			playerMap: PlayerMap,
			onPlayerProcessed?: (success: boolean, playerName?: string) => void,
		) => Promise<void>,
		onPlayerProcessed?: (success: boolean, playerName?: string) => void,
		onTournamentComplete?: (success: boolean, tournamentName: string) => void,
	): Promise<ImportResultSummary> {
		const result: ImportResultSummary = {
			tournamentId: tournamentData.id,
			tournamentName: tournamentData.name,
			eventName: "", // Will be populated when we fetch event
			resultsImported: 0,
			errors: [],
		}

		try {
			// Fetch player map for this event (optimization: single query instead of N+1)
			const playerMap = await this.fetchPlayerMapForEvent(tournamentData.eventId)

			// Delete existing results (idempotent)
			await this.eventsService.deleteTournamentResults(tournamentData.id)

			// Fetch results from Golf Genius
			const ggResults = await this.fetchGGResults(tournamentData, result)
			if (!ggResults) {
				return result
			}

			// Process results using the provided processor
			await processor(tournamentData, result, ggResults, playerMap, onPlayerProcessed)

			// Call tournament completion callback on success
			onTournamentComplete?.(true, tournamentData.name)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			result.errors.push(`Unexpected error: ${errorMessage}`)
			this.logger.error("Unexpected error importing results", {
				tournamentId: tournamentData.id,
				error: errorMessage,
			})

			// Call tournament completion callback on failure
			onTournamentComplete?.(false, tournamentData.name)
		}

		return result
	}

	private async fetchGGResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
	): Promise<GolfGeniusTournamentResults | null> {
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

	private async fetchPlayerMapForEvent(eventId: number): Promise<PlayerMap> {
		return this.registrationService.getPlayerMapForEvent(eventId)
	}

	private resolvePlayerFromMap(
		memberId: string,
		playerMap: PlayerMap,
		result: ImportResultSummary,
	): PlayerRecord | null {
		const player = playerMap.get(memberId)
		if (!player) {
			result.errors.push(`No player found for id ${memberId}`)
			return null
		}
		return player
	}

	private async processResults<T extends GGAggregate>(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: GolfGeniusTournamentResults,
		playerMap: PlayerMap,
		parser: {
			validateResponse: (ggResults: GolfGeniusTournamentResults) => string | null
			extractScopes: (ggResults: GolfGeniusTournamentResults) => GGScope[]
			extractFlightName: (scope: GGScope) => string
			extractAggregates: (scope: GGScope) => GGAggregate[]
		},
		prepareRecord: (
			tournamentData: TournamentData,
			aggregate: T,
			flightName: string,
			result: ImportResultSummary,
			playerMap: PlayerMap,
		) => PreparedTournamentResult | PreparedTournamentResult[] | null,
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

		const preparedRecords: PreparedTournamentResult[] = []

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
						if (Array.isArray(preparedRecord)) {
							preparedRecords.push(...preparedRecord)
							success = preparedRecord.length > 0
						} else {
							preparedRecords.push(preparedRecord)
							success = true
						}
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
			await this.eventsService.insertTournamentResults(preparedRecords)
			result.resultsImported += preparedRecords.length
		}
	}

	// ============= FORMAT-SPECIFIC PROCESSORS =============

	private async processSkinsResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: GolfGeniusTournamentResults,
		playerMap: PlayerMap,
		onPlayerProcessed?: (success: boolean, playerName?: string) => void,
	): Promise<void> {
		return this.processResults<SkinsTournamentAggregate>(
			tournamentData,
			result,
			ggResults,
			playerMap,
			SkinsResultParser,
			this.prepareSkinsPlayerResult.bind(this),
			onPlayerProcessed,
		)
	}

	private async processProxyResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: GolfGeniusTournamentResults,
		playerMap: PlayerMap,
		onPlayerProcessed?: (success: boolean, playerName?: string) => void,
	): Promise<void> {
		return this.processResults<ProxyTournamentAggregate>(
			tournamentData,
			result,
			ggResults,
			playerMap,
			ProxyResultParser,
			this.prepareProxyPlayerResult.bind(this),
			onPlayerProcessed,
		)
	}

	private async processStrokeResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: GolfGeniusTournamentResults,
		playerMap: PlayerMap,
		onPlayerProcessed?: (success: boolean, playerName?: string) => void,
	): Promise<void> {
		return this.processResults<StrokeTournamentAggregate>(
			tournamentData,
			result,
			ggResults,
			playerMap,
			StrokePlayResultParser,
			this.prepareStrokePlayerResult.bind(this),
			onPlayerProcessed,
		)
	}

	private async processQuotaResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: GolfGeniusTournamentResults,
		playerMap: PlayerMap,
		onPlayerProcessed?: (success: boolean, playerName?: string) => void,
	): Promise<void> {
		return this.processResults<QuotaTournamentAggregate>(
			tournamentData,
			result,
			ggResults,
			playerMap,
			QuotaResultParser,
			this.prepareQuotaPlayerResult.bind(this),
			onPlayerProcessed,
		)
	}

	private async processTeamResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: GolfGeniusTournamentResults,
		playerMap: PlayerMap,
		onPlayerProcessed?: (success: boolean, playerName?: string) => void,
	): Promise<void> {
		return this.processResults<GGAggregate>(
			tournamentData,
			result,
			ggResults,
			playerMap,
			TeamResultParser,
			this.prepareTeamPlayerResult.bind(this),
			onPlayerProcessed,
		)
	}

	private prepareProxyPlayerResult(
		tournamentData: TournamentData,
		aggregate: ProxyTournamentAggregate,
		flightName: string,
		result: ImportResultSummary,
		playerMap: PlayerMap,
	): PreparedTournamentResult | null {
		// Only process winners (position === "1")
		if (aggregate.position !== "1") {
			return null // Skip non-winners
		}

		// Extract member cards and get first member card
		const memberCards = ProxyResultParser.extractMemberCards(aggregate as GGAggregate)
		if (!memberCards || memberCards.length === 0) {
			result.errors.push(`No member cards found for aggregate ${aggregate.name || "Unknown"}`)
			return null
		}
		const memberId = memberCards[0].member_id_str

		// Parse player data using parser
		const playerData = ProxyResultParser.parsePlayerData(aggregate as GGAggregate, memberCards[0])

		// Resolve player using pre-fetched player map
		const player = this.resolvePlayerFromMap(memberId, playerMap, result)
		if (!player) {
			return null
		}

		// Parse position (should always be 1 for winners)
		const position = 1

		// Parse purse amount
		const amount = parsePurseAmount(playerData.purse)
		if (amount === null) {
			return null
		}

		// Score is not relevant for proxy tournaments
		const score: number | null = null

		// Return prepared data instead of inserting
		return {
			tournamentId: tournamentData.id,
			playerId: player.id,
			flight: flightName || null,
			position,
			score,
			amount: amount.toFixed(2),
			details: null,
			summary: null,
			createDate: toDbString(new Date()),
			payoutDate: toDbString(new Date()),
			payoutStatus: "Pending",
			payoutTo: "Individual",
			payoutType: "Credit",
			teamId: null,
		}
	}

	private prepareSkinsPlayerResult(
		tournamentData: TournamentData,
		aggregate: SkinsTournamentAggregate,
		flightName: string,
		result: ImportResultSummary,
		playerMap: PlayerMap,
	): PreparedTournamentResult | null {
		// Extract member cards and get first member card
		const memberCards = SkinsResultParser.extractMemberCards(aggregate as GGAggregate)
		if (!memberCards || memberCards.length === 0) {
			result.errors.push(`No member cards found for aggregate ${aggregate.name || "Unknown"}`)
			return null
		}
		const memberId = memberCards[0].member_id_str

		// Parse player data using parser
		const playerData = SkinsResultParser.parsePlayerData(aggregate, memberCards[0])

		// Resolve player using pre-fetched player map
		const player = this.resolvePlayerFromMap(memberId, playerMap, result)
		if (!player) {
			return null
		}

		// Parse purse amount
		const amount = parsePurseAmount(playerData.purse)
		if (amount === null) {
			return null
		}

		// Position is the number of skins won
		// Default to 1 in the case of ties - when the leaderboard
		// is adjusted to break a tie, no total will be available
		let position = parseInt(aggregate.total || "1", 10)
		if (!position) position = 1

		// Score is not relevant for skins tournaments
		const score: number | null = null

		// Return prepared data instead of inserting
		return {
			tournamentId: tournamentData.id,
			playerId: player.id,
			flight: flightName || null,
			position,
			score,
			amount: amount.toFixed(2),
			summary: playerData.details,
			details: null,
			createDate: toDbString(new Date()),
			payoutDate: toDbString(new Date()),
			payoutStatus: "Pending",
			payoutTo: "Individual", // TODO: Implement team handling for team skins
			payoutType: "Cash",
			teamId: null,
		}
	}

	private prepareStrokePlayerResult(
		tournamentData: TournamentData,
		aggregate: StrokeTournamentAggregate,
		flightName: string,
		result: ImportResultSummary,
		playerMap: PlayerMap,
	): PreparedTournamentResult | null {
		// Extract member cards and get first member card
		const memberCards = StrokePlayResultParser.extractMemberCards(aggregate as GGAggregate)
		if (!memberCards || memberCards.length === 0) {
			result.errors.push(`No member cards found for aggregate ${aggregate.name || "Unknown"}`)
			return null
		}
		const memberId = memberCards[0].member_id_str

		// Parse player data using parser
		const playerData = StrokePlayResultParser.parsePlayerData(
			aggregate as GGAggregate,
			memberCards[0],
		)

		// Resolve player using pre-fetched player map
		const player = this.resolvePlayerFromMap(memberId, playerMap, result)
		if (!player) {
			return null
		}

		// Parse position from aggregate.position
		const positionStr = playerData.position
		let position = 0
		try {
			position = positionStr && positionStr.trim() !== "" ? parseInt(positionStr, 10) : 0
		} catch {
			position = 0
		}

		// Parse score (total strokes)
		const totalStr = playerData.total
		let score: number | null = null
		try {
			score = totalStr && totalStr.trim() !== "" ? parseInt(totalStr, 10) : null
		} catch {
			score = null
		}

		// Parse purse amount
		const amount = parsePurseAmount(playerData.purse)
		if (amount === null) {
			return null
		}

		// Return prepared data instead of inserting
		return {
			tournamentId: tournamentData.id,
			playerId: player.id,
			flight: flightName || null,
			position,
			score,
			amount: amount.toFixed(2),
			details: null,
			summary: null,
			createDate: toDbString(new Date()),
			payoutDate: toDbString(new Date()),
			payoutStatus: "Pending",
			payoutTo: "Individual",
			payoutType: "Credit",
			teamId: null,
		}
	}

	private prepareQuotaPlayerResult(
		tournamentData: TournamentData,
		aggregate: QuotaTournamentAggregate,
		flightName: string,
		result: ImportResultSummary,
		playerMap: PlayerMap,
	): PreparedTournamentResult | null {
		// Extract member cards and get first member card
		const memberCards = QuotaResultParser.extractMemberCards(aggregate as GGAggregate)
		if (!memberCards || memberCards.length === 0) {
			result.errors.push(`No member cards found for aggregate ${aggregate.name || "Unknown"}`)
			return null
		}
		const memberId = memberCards[0].member_id_str

		// Parse player data using parser
		const playerData = QuotaResultParser.parsePlayerData(aggregate as GGAggregate, memberCards[0])

		// Resolve player using pre-fetched player map
		const player = this.resolvePlayerFromMap(memberId, playerMap, result)
		if (!player) {
			return null
		}

		// Parse position from aggregate.position
		const positionStr = playerData.position
		let position = 0
		try {
			position = positionStr && positionStr.trim() !== "" ? parseInt(positionStr, 10) : 0
		} catch {
			position = 0
		}

		// Parse score from aggregate.total (the quota result like +2, -1)
		const totalStr = playerData.total
		let score: number | null = null
		try {
			score = totalStr && totalStr.trim() !== "" ? parseInt(totalStr, 10) : null
		} catch {
			score = null
		}

		// Parse summary from aggregate.score formatted as "Quota score: [value]"
		const scoreStr = playerData.score
		let summary: string | null = null
		try {
			if (scoreStr && scoreStr.trim() !== "") {
				summary = `Quota score: ${scoreStr}`
			}
		} catch {
			summary = null
		}

		// Parse purse amount
		const amount = parsePurseAmount(playerData.purse)
		if (amount === null) {
			return null
		}

		// Return prepared data
		return {
			tournamentId: tournamentData.id,
			playerId: player.id,
			flight: flightName || null,
			position,
			score,
			amount: amount.toFixed(2),
			details: null,
			summary,
			createDate: toDbString(new Date()),
			payoutDate: toDbString(new Date()),
			payoutStatus: "Pending",
			payoutTo: "Individual",
			payoutType: "Credit",
			teamId: null,
		}
	}

	private prepareTeamPlayerResult(
		tournamentData: TournamentData,
		aggregate: GGAggregate,
		flightName: string,
		result: ImportResultSummary,
		playerMap: PlayerMap,
	): PreparedTournamentResult[] | null {
		// Parse team name to extract blind player names
		const blindNames = new Set<string>()
		const teamName = aggregate.name || "Unknown Team"
		const entries = teamName.split("+").map((e) => e.trim())

		for (const entry of entries) {
			if (entry.startsWith("Bl[")) {
				const match = entry.match(/Bl\[(.*?)\]/)
				if (match) {
					// Extract blind name and normalize to lowercase for comparison
					blindNames.add(match[1].toLowerCase())
				}
			}
		}

		// Loop over individual_results (or member_cards if no indiv array)
		const individualResults = aggregate.individual_results || []
		const preparedRecords: PreparedTournamentResult[] = [] // Collect multiple

		for (const indiv of individualResults) {
			const memberId = indiv.member_id_str

			// Resolve player
			const player = this.resolvePlayerFromMap(memberId, playerMap, result)
			if (!player) {
				continue // Skip this player, but continue for others
			}

			// Check if this player is a blind draw
			const playerFullName = `${player.firstName} ${player.lastName}`.toLowerCase()
			if (blindNames.has(playerFullName)) {
				result.skippedBlinds = (result.skippedBlinds || 0) + 1
				this.logger.log(
					`Skipping blind player: ${player.firstName} ${player.lastName} (team: ${teamName})`,
				)
				continue // Skip blind players - they don't get tournamentResult records
			}

			// Parse team-level fields
			const position = parseInt(aggregate.position || "0", 10) || 0
			const amount = parsePurseAmount(aggregate.purse) // Full purse per player (no split)
			if (amount === null) {
				continue
			}

			// Parse team score (aggregate total) - each player gets the team score
			let score: number | null = null
			try {
				score =
					aggregate.total && aggregate.total.trim() !== "" ? parseInt(aggregate.total, 10) : null
			} catch {
				this.logger.warn(`Failed to parse team total score for ${teamName}: ${aggregate.total}`)
				score = null
			}

			// Prepare record
			const record: PreparedTournamentResult = {
				tournamentId: tournamentData.id,
				playerId: player.id,
				flight: flightName || null,
				position,
				score,
				amount: amount.toFixed(2),
				details: teamName, // Team name in details
				summary: "Team win",
				createDate: toDbString(new Date()),
				payoutDate: toDbString(new Date()),
				payoutStatus: "Pending",
				payoutTo: "Team", // Or "Individual" if per-player payout
				payoutType: "Credit",
				teamId: aggregate.id_str, // Link to team aggregate ID
			}

			preparedRecords.push(record)
		}

		// If no valid players, return null (skip team)
		if (preparedRecords.length === 0) {
			return null
		}

		// Return all prepared records for this team
		return preparedRecords
	}
}

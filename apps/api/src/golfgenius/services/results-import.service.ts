import {
	and,
	eq,
} from "drizzle-orm"

import {
	Injectable,
	Logger,
} from "@nestjs/common"

import { DrizzleService } from "../../database/drizzle.service"
import {
	event,
	round,
	tournament,
	tournamentPoints,
	tournamentResult,
} from "../../database/schema"
import { ApiClient } from "../api-client"
import {
	GGAggregate,
	GolfGeniusTournamentResults,
	ImportResultSummary,
	PointsTournamentAggregate,
	ProxyTournamentAggregate,
	SkinsTournamentAggregate,
	StrokeTournamentAggregate,
} from "../dto/tournament-results.dto"
import {
	PointsResultParser,
	ProxyResultParser,
	SkinsResultParser,
	StrokePlayResultParser,
} from "./result-parsers"

type TournamentData = {
	id: number
	name: string
	format: string | null
	isNet: number
	ggId: string
	eventId: number
	roundId: number
	eventGgId: string | null
	roundGgId: string
}

interface PreparedTournamentResult {
	tournamentId: number
	playerId: number
	flight: string | null
	position: number
	score: number | null
	amount: string
	summary: string | null
	details: string | null
	createDate: string
	payoutDate: string | null
	payoutStatus: string | null
	payoutTo: string | null
	payoutType: string | null
	teamId: string | null
}

interface PlayerRecord {
	id: number
	firstName: string
	lastName: string
	email: string
	phone?: string
}

type PlayerMap = Map<string, PlayerRecord>

@Injectable()
export class ResultsImportService {
	private readonly logger = new Logger(ResultsImportService.name)

	constructor(
		private readonly apiClient: ApiClient,
		private readonly drizzle: DrizzleService,
	) {}

	// ============= PUBLIC METHODS =============

	async importPointsResults(eventId: number): Promise<ImportResultSummary[]> {
		return this.importResultsByFormat(eventId, "points", this.processPointsResults.bind(this))
	}

	async importSkinsResults(eventId: number): Promise<ImportResultSummary[]> {
		return this.importResultsByFormat(eventId, "skins", this.processSkinsResults.bind(this))
	}

	async importProxyResults(eventId: number): Promise<ImportResultSummary[]> {
		return this.importResultsByFormat(eventId, "user_scored", this.processProxyResults.bind(this))
	}

	async importStrokePlayResults(eventId: number): Promise<ImportResultSummary[]> {
		return this.importResultsByFormat(eventId, "stroke", this.processStrokeResults.bind(this))
	}

	// ============= PRIVATE HELPER METHODS =============

	private async importResultsByFormat(
		eventId: number,
		format: string,
		processor: (
			tournamentData: TournamentData,
			result: ImportResultSummary,
			ggResults: GolfGeniusTournamentResults,
			playerMap: PlayerMap,
		) => Promise<void>,
	): Promise<ImportResultSummary[]> {
		const tournaments = await this.drizzle.db
			.select({
				id: tournament.id,
				name: tournament.name,
				format: tournament.format,
				isNet: tournament.isNet,
				ggId: tournament.ggId,
				eventId: tournament.eventId,
				roundId: tournament.roundId,
				eventGgId: event.ggId,
				roundGgId: round.ggId,
			})
			.from(tournament)
			.innerJoin(event, eq(tournament.eventId, event.id))
			.innerJoin(round, eq(tournament.roundId, round.id))
			.where(and(eq(tournament.eventId, eventId), eq(tournament.format, format)))

		if (tournaments.length === 0) {
			this.logger.log("No " + format + " tournaments found for event", { eventId })
			return []
		}

		const results: ImportResultSummary[] = []

		for (const t of tournaments) {
			const result = await this.importTournamentResults(t, processor)
			results.push(result)
		}

		return results
	}

	private async fetchPlayerMapForEvent(eventId: number): Promise<PlayerMap> {
		const { player, registrationSlot } = await import("../../database/schema/registration.schema")

		const playerRecords = await this.drizzle.db
			.select({
				ggId: registrationSlot.ggId,
				id: player.id,
				firstName: player.firstName,
				lastName: player.lastName,
				email: player.email,
			})
			.from(registrationSlot)
			.innerJoin(player, eq(registrationSlot.playerId, player.id))
			.where(eq(registrationSlot.eventId, eventId))

		const playerMap = new Map<string, PlayerRecord>()
		for (const record of playerRecords) {
			if (record.ggId) {
				// Only include records with valid ggId
				playerMap.set(record.ggId, {
					id: record.id,
					firstName: record.firstName,
					lastName: record.lastName,
					email: record.email,
				})
			}
		}
		return playerMap
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

	private async importTournamentResults(
		tournamentData: TournamentData,
		processor: (
			tournamentData: TournamentData,
			result: ImportResultSummary,
			ggResults: GolfGeniusTournamentResults,
			playerMap: PlayerMap,
		) => Promise<void>,
	): Promise<ImportResultSummary> {
		const result: ImportResultSummary = {
			tournamentId: tournamentData.id,
			tournamentName: tournamentData.name,
			eventName: "", // Will be populated when we fetch event
			resultsImported: 0,
			errors: [],
		}

		try {
			// Validate tournament has GG IDs
			if (!this.validateTournament(tournamentData, result)) {
				return result
			}

			// Fetch player map for this event (optimization: single query instead of N+1)
			const playerMap = await this.fetchPlayerMapForEvent(tournamentData.eventId)

			// Delete existing results (idempotent)
			await this.deleteExistingResults(tournamentData)

			// Fetch results from Golf Genius
			const ggResults = await this.fetchGGResults(tournamentData, result)
			if (!ggResults) {
				return result
			}

			// Process results using the provided processor
			await processor(tournamentData, result, ggResults, playerMap)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			result.errors.push(`Unexpected error: ${errorMessage}`)
			this.logger.error("Unexpected error importing results", {
				tournamentId: tournamentData.id,
				error: errorMessage,
			})
		}

		return result
	}

	private validateTournament(tournamentData: TournamentData, result: ImportResultSummary): boolean {
		if (!tournamentData.ggId) {
			result.errors.push("Tournament must be synced with Golf Genius first")
			return false
		}
		// Add validation for event.gg_id and round.gg_id if needed
		return true
	}

	private async deleteExistingResults(tournamentData: TournamentData): Promise<void> {
		await this.drizzle.db
			.delete(tournamentResult)
			.where(eq(tournamentResult.tournamentId, tournamentData.id))
		await this.drizzle.db
			.delete(tournamentPoints)
			.where(eq(tournamentPoints.tournamentId, tournamentData.id))

		this.logger.log("Deleted existing results", { tournamentId: tournamentData.id })
	}

	private async fetchGGResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
	): Promise<any> {
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

	private parsePurseAmount(purseStr: string): number | null {
		if (!purseStr || purseStr.trim() === "") return null

		try {
			const cleaned = purseStr.replace(/[$,]/g, "").trim()
			if (!cleaned) return null

			const amount = parseFloat(cleaned)
			return amount > 0 ? amount : null
		} catch {
			this.logger.warn("Failed to parse purse amount", { purseStr })
			return null
		}
	}

	private async processResults<T extends GGAggregate>(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: GolfGeniusTournamentResults,
		playerMap: PlayerMap,
		parser: {
			validateResponse: (ggResults: GolfGeniusTournamentResults) => string | null
			extractScopes: (ggResults: GolfGeniusTournamentResults) => any[]
			extractFlightName: (scope: any) => string
			extractAggregates: (scope: any) => GGAggregate[]
		},
		prepareRecord: (
			tournamentData: TournamentData,
			aggregate: T,
			flightName: string,
			result: ImportResultSummary,
			playerMap: PlayerMap,
		) => PreparedTournamentResult | null,
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
					}
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error)
					result.errors.push(`Error processing player result: ${errorMessage}`)
					this.logger.error("Error processing player result", {
						tournamentId: tournamentData.id,
						error: errorMessage,
					})
				}
			}
		}

		// Batch insert all prepared records
		if (preparedRecords.length > 0) {
			await this.drizzle.db.insert(tournamentResult).values(preparedRecords)
			result.resultsImported += preparedRecords.length

			this.logger.log("Batch inserted results", {
				tournamentId: tournamentData.id,
				recordsInserted: preparedRecords.length,
			})
		}
	}

	// ============= FORMAT-SPECIFIC PROCESSORS =============

	private async processPointsResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: GolfGeniusTournamentResults,
		playerMap: PlayerMap,
	): Promise<void> {
		return this.processResults<PointsTournamentAggregate>(
			tournamentData,
			result,
			ggResults,
			playerMap,
			PointsResultParser,
			this.preparePointsPlayerResult.bind(this),
		)
	}

	private async processSkinsResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: GolfGeniusTournamentResults,
		playerMap: PlayerMap,
	): Promise<void> {
		return this.processResults<SkinsTournamentAggregate>(
			tournamentData,
			result,
			ggResults,
			playerMap,
			SkinsResultParser,
			this.prepareSkinsPlayerResult.bind(this),
		)
	}

	private async processProxyResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: GolfGeniusTournamentResults,
		playerMap: PlayerMap,
	): Promise<void> {
		return this.processResults<ProxyTournamentAggregate>(
			tournamentData,
			result,
			ggResults,
			playerMap,
			ProxyResultParser,
			this.prepareProxyPlayerResult.bind(this),
		)
	}

	private async processStrokeResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: GolfGeniusTournamentResults,
		playerMap: PlayerMap,
	): Promise<void> {
		return this.processResults<StrokeTournamentAggregate>(
			tournamentData,
			result,
			ggResults,
			playerMap,
			StrokePlayResultParser,
			this.prepareStrokePlayerResult.bind(this),
		)
	}

	private preparePointsPlayerResult(
		tournamentData: TournamentData,
		aggregate: PointsTournamentAggregate,
		flightName: string,
		result: ImportResultSummary,
		playerMap: PlayerMap,
	): PreparedTournamentResult | null {
		// Extract member cards and get first member card
		const memberCards = PointsResultParser.extractMemberCards(aggregate as GGAggregate)
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
			return null
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
		} catch {
			score = null
		}

		// Build details string
		const positionDetails = PointsResultParser.formatPositionDetails(playerData.position)
		const details = `${tournamentData.name}${flightName ? " - " : ""}${flightName ?? ""}: ${positionDetails}`

		// Return prepared data instead of inserting
		return {
			tournamentId: tournamentData.id,
			playerId: player.id,
			flight: flightName || null,
			position,
			score,
			amount: "0.00",
			summary: null,
			details,
			createDate: new Date().toISOString().slice(0, 19).replace("T", " "),
			payoutDate: null,
			payoutStatus: null,
			payoutTo: null,
			payoutType: null,
			teamId: null,
		}
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
		const amount = this.parsePurseAmount(playerData.purse)
		if (amount === null) {
			result.errors.push(`Invalid purse amount for winner: ${playerData.purse}`)
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
			createDate: new Date().toISOString().slice(0, 19).replace("T", " "),
			payoutDate: new Date().toISOString().slice(0, 19).replace("T", " "),
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
		// Only process players who won skins (total > 0)
		const totalSkins = parseInt(aggregate.total || "0", 10)
		if (isNaN(totalSkins) || totalSkins <= 0) {
			return null // Skip players who didn't win skins
		}

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

		// Position is the number of skins won
		const position = totalSkins

		// Parse purse amount
		const amount = this.parsePurseAmount(playerData.purse)
		if (amount === null) {
			result.errors.push(`Invalid purse amount for skins winner: ${playerData.purse}`)
			return null
		}

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
			createDate: new Date().toISOString().slice(0, 19).replace("T", " "),
			payoutDate: new Date().toISOString().slice(0, 19).replace("T", " "),
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
		// Only process players who won money (purse is not empty)
		if (!aggregate.purse || aggregate.purse.trim() === "") {
			return null // Skip players who didn't win money
		}

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
		const amount = this.parsePurseAmount(playerData.purse)
		if (amount === null) {
			result.errors.push(`Invalid purse amount for stroke play winner: ${playerData.purse}`)
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
			createDate: new Date().toISOString().slice(0, 19).replace("T", " "),
			payoutDate: new Date().toISOString().slice(0, 19).replace("T", " "),
			payoutStatus: "Pending",
			payoutTo: "Individual",
			payoutType: "Credit",
			teamId: null,
		}
	}
}

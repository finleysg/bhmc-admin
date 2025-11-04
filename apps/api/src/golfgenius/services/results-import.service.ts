import { and, eq } from "drizzle-orm"

import { Injectable, Logger } from "@nestjs/common"

import { DrizzleService } from "../../database/drizzle.service"
import { event, eventPoints, round, tournament, tournamentResult } from "../../database/schema"
import { ApiClient } from "../api-client"
import { GGAggregate, ImportResultSummary } from "../dto/tournament-results.dto"
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

interface PointsAggregate {
	name?: string
	[key: string]: unknown
}

interface SkinsAggregate {
	total?: string
	name?: string
	[key: string]: unknown
}

interface ProxyAggregate {
	position?: string
	name?: string
	[key: string]: unknown
}

interface StrokeAggregate {
	purse?: string
	name?: string
	[key: string]: unknown
}

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
			ggResults: any,
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

	private async importTournamentResults(
		tournamentData: TournamentData,
		processor: (
			tournamentData: TournamentData,
			result: ImportResultSummary,
			ggResults: any,
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

			// Delete existing results (idempotent)
			await this.deleteExistingResults(tournamentData)

			// Fetch results from Golf Genius
			const ggResults = await this.fetchGGResults(tournamentData, result)
			if (!ggResults) {
				return result
			}

			// Process results using the provided processor
			await processor(tournamentData, result, ggResults)
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

	// ============= FORMAT-SPECIFIC PROCESSORS =============

	private async processPointsResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: any,
	): Promise<void> {
		// Delete existing points for this event (not tournament)
		await this.drizzle.db.delete(eventPoints).where(eq(eventPoints.eventId, tournamentData.eventId))

		this.logger.log("Deleted existing points for event", { eventId: tournamentData.eventId })

		// Validate response structure
		const error = PointsResultParser.validateResponse(ggResults)
		if (error) {
			result.errors.push(error)
			return
		}

		// Extract scopes (flights/divisions)
		const scopes = PointsResultParser.extractScopes(ggResults)

		// Process each scope
		for (const scope of scopes) {
			const flightName = PointsResultParser.extractFlightName(scope)
			const aggregates = PointsResultParser.extractAggregates(scope)

			// Process each player result
			for (const aggregate of aggregates) {
				try {
					await this.processPointsPlayerResult(tournamentData, aggregate, flightName, result)
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error)
					result.errors.push(`Error processing points player result: ${errorMessage}`)
					this.logger.error("Error processing points player result", {
						tournamentId: tournamentData.id,
						error: errorMessage,
					})
				}
			}
		}
	}

	private async processPointsPlayerResult(
		tournamentData: TournamentData,
		aggregate: PointsAggregate,
		flightName: string,
		result: ImportResultSummary,
	): Promise<void> {
		// Extract member cards and get first member card
		const memberCards = PointsResultParser.extractMemberCards(aggregate as GGAggregate)
		if (!memberCards || memberCards.length === 0) {
			result.errors.push(`No member cards found for aggregate ${aggregate.name || "Unknown"}`)
			return
		}

		// Parse player data using parser
		const playerData = PointsResultParser.parsePlayerData(aggregate, memberCards[0])

		// Resolve player using member card ID
		const player = await this.resolvePlayerFromMemberCard(memberCards[0], result)
		if (!player) {
			return
		}

		// Parse position from rank attribute
		const rankStr = playerData.rank
		let position = 0
		try {
			position = rankStr && rankStr.trim() !== "" ? parseInt(rankStr, 10) : 0
		} catch {
			position = 0
		}

		// Parse points and convert to whole number with proper rounding
		const pointsStr = playerData.points
		let points: number
		if (pointsStr === "0.00") {
			points = 0
		} else {
			const pointsDecimal = parseFloat(pointsStr)
			points = Math.round(pointsDecimal) // ROUND_HALF_UP behavior
		}

		// Parse score (total strokes) if available
		const totalStr = playerData.total
		let score: number | null = null
		try {
			score = totalStr && totalStr.trim() !== "" ? parseInt(totalStr, 10) : null
		} catch {
			score = null
		}

		// Build division string: tournament name + scope name + position details
		const positionDetails = PointsResultParser.formatPositionDetails(playerData.position)
		const division = `${tournamentData.name} - ${flightName || "N/A"} - ${positionDetails}`

		// Create eventPoints record
		await this.drizzle.db.insert(eventPoints).values({
			eventId: tournamentData.eventId,
			playerId: player.id,
			position,
			score,
			points,
			isNet: tournamentData.isNet,
			division,
			createDate: new Date().toISOString().slice(0, 19).replace("T", " "),
		})

		result.resultsImported += 1
		this.logger.debug("Points result created", {
			eventId: tournamentData.eventId,
			playerId: player.id,
			position,
			points,
			division,
		})
	}

	private async processProxyPlayerResult(
		tournamentData: TournamentData,
		aggregate: ProxyAggregate,
		flightName: string,
		result: ImportResultSummary,
	): Promise<void> {
		// Only process winners (position === "1")
		if (aggregate.position !== "1") {
			return // Skip non-winners
		}

		// Extract member cards and get first member card
		const memberCards = ProxyResultParser.extractMemberCards(aggregate as GGAggregate)
		if (!memberCards || memberCards.length === 0) {
			result.errors.push(`No member cards found for aggregate ${aggregate.name || "Unknown"}`)
			return
		}

		// Parse player data using parser
		const playerData = ProxyResultParser.parsePlayerData(aggregate, memberCards[0])

		// Resolve player using member card ID
		const player = await this.resolvePlayerFromMemberCard(memberCards[0], result)
		if (!player) {
			return
		}

		// Parse position (should always be 1 for winners)
		const position = 1

		// Parse purse amount
		const amount = this.parsePurseAmount(playerData.purse)
		if (amount === null) {
			result.errors.push(`Invalid purse amount for winner: ${playerData.purse}`)
			return
		}

		// Score is not relevant for proxy tournaments
		const score: number | null = null

		// Create tournamentResult record
		await this.drizzle.db.insert(tournamentResult).values({
			tournamentId: tournamentData.id,
			playerId: player.id,
			flight: flightName || null,
			position,
			score,
			amount: amount.toFixed(2),
			details: null,
			createDate: new Date().toISOString().slice(0, 19).replace("T", " "),
		})

		result.resultsImported += 1
		this.logger.debug("Proxy result created", {
			tournamentId: tournamentData.id,
			playerId: player.id,
			position,
			amount,
			score,
		})
	}

	private async processSkinsPlayerResult(
		tournamentData: TournamentData,
		aggregate: SkinsAggregate,
		flightName: string,
		result: ImportResultSummary,
	): Promise<void> {
		// Only process players who won skins (total > 0)
		const totalSkins = parseInt(aggregate.total || "0", 10)
		if (isNaN(totalSkins) || totalSkins <= 0) {
			return // Skip players who didn't win skins
		}

		// Extract member cards and get first member card
		const memberCards = SkinsResultParser.extractMemberCards(aggregate as GGAggregate)
		if (!memberCards || memberCards.length === 0) {
			result.errors.push(`No member cards found for aggregate ${aggregate.name || "Unknown"}`)
			return
		}

		// Parse player data using parser
		const playerData = SkinsResultParser.parsePlayerData(aggregate, memberCards[0])

		// Resolve player using member card ID
		const player = await this.resolvePlayerFromMemberCard(memberCards[0], result)
		if (!player) {
			return
		}

		// Position is the number of skins won
		const position = totalSkins

		// Parse purse amount
		const amount = this.parsePurseAmount(playerData.purse)
		if (amount === null) {
			result.errors.push(`Invalid purse amount for skins winner: ${playerData.purse}`)
			return
		}

		// Score is not relevant for skins tournaments
		const score: number | null = null

		// Create tournamentResult record
		await this.drizzle.db.insert(tournamentResult).values({
			tournamentId: tournamentData.id,
			playerId: player.id,
			flight: flightName || null,
			position,
			score,
			amount: amount.toFixed(2),
			summary: playerData.details,
			details: null,
			createDate: new Date().toISOString().slice(0, 19).replace("T", " "),
		})

		result.resultsImported += 1
		this.logger.debug("Skins result created", {
			tournamentId: tournamentData.id,
			playerId: player.id,
			position,
			amount,
			summary: playerData.details,
		})
	}

	private async processStrokePlayerResult(
		tournamentData: TournamentData,
		aggregate: StrokeAggregate,
		flightName: string,
		result: ImportResultSummary,
	): Promise<void> {
		// Only process players who won money (purse is not empty)
		if (!aggregate.purse || aggregate.purse.trim() === "") {
			return // Skip players who didn't win money
		}

		// Extract member cards and get first member card
		const memberCards = StrokePlayResultParser.extractMemberCards(aggregate as GGAggregate)
		if (!memberCards || memberCards.length === 0) {
			result.errors.push(`No member cards found for aggregate ${aggregate.name || "Unknown"}`)
			return
		}

		// Parse player data using parser
		const playerData = StrokePlayResultParser.parsePlayerData(aggregate, memberCards[0])

		// Resolve player using member card ID
		const player = await this.resolvePlayerFromMemberCard(memberCards[0], result)
		if (!player) {
			return
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
			return
		}

		// Create tournamentResult record
		await this.drizzle.db.insert(tournamentResult).values({
			tournamentId: tournamentData.id,
			playerId: player.id,
			flight: flightName || null,
			position,
			score,
			amount: amount.toFixed(2),
			details: null,
			summary: null,
			createDate: new Date().toISOString().slice(0, 19).replace("T", " "),
		})

		result.resultsImported += 1
		this.logger.debug("Stroke play result created", {
			tournamentId: tournamentData.id,
			playerId: player.id,
			position,
			score,
			amount,
		})
	}

	private async resolvePlayerFromMemberCard(
		memberCard: any,
		result: ImportResultSummary,
	): Promise<any> {
		const memberCardId = memberCard.member_card_id_str
		try {
			// Use dynamic import to avoid circular dependency issues
			const { player } = await import("../../database/schema/registration.schema")
			const foundPlayer = await this.drizzle.db
				.select()
				.from(player)
				.where(eq(player.ggId, memberCardId))
				.limit(1)

			if (!foundPlayer || foundPlayer.length === 0) {
				result.errors.push(`Player not found with Golf Genius ID ${memberCardId}`)
				return null
			}

			return foundPlayer[0]
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			result.errors.push(`Error resolving player ${memberCardId}: ${errorMessage}`)
			return null
		}
	}

	private async processSkinsResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: any,
	): Promise<void> {
		// Validate response structure
		const error = SkinsResultParser.validateResponse(ggResults)
		if (error) {
			result.errors.push(error)
			return
		}

		// Extract scopes (flights/divisions)
		const scopes = SkinsResultParser.extractScopes(ggResults)

		// Process each scope
		for (const scope of scopes) {
			const flightName = SkinsResultParser.extractFlightName(scope)
			const aggregates = SkinsResultParser.extractAggregates(scope)

			// Process each player result (only those who won skins)
			for (const aggregate of aggregates) {
				try {
					await this.processSkinsPlayerResult(tournamentData, aggregate, flightName, result)
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error)
					result.errors.push(`Error processing skins player result: ${errorMessage}`)
					this.logger.error("Error processing skins player result", {
						tournamentId: tournamentData.id,
						error: errorMessage,
					})
				}
			}
		}
	}

	private async processProxyResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: any,
	): Promise<void> {
		// Validate response structure
		const error = ProxyResultParser.validateResponse(ggResults)
		if (error) {
			result.errors.push(error)
			return
		}

		// Extract scopes (flights/divisions)
		const scopes = ProxyResultParser.extractScopes(ggResults)

		// Process each scope
		for (const scope of scopes) {
			const flightName = ProxyResultParser.extractFlightName(scope)
			const aggregates = ProxyResultParser.extractAggregates(scope)

			// Process each player result (only winners)
			for (const aggregate of aggregates) {
				try {
					await this.processProxyPlayerResult(tournamentData, aggregate, flightName, result)
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error)
					result.errors.push(`Error processing proxy player result: ${errorMessage}`)
					this.logger.error("Error processing proxy player result", {
						tournamentId: tournamentData.id,
						error: errorMessage,
					})
				}
			}
		}
	}

	private async processStrokeResults(
		tournamentData: TournamentData,
		result: ImportResultSummary,
		ggResults: any,
	): Promise<void> {
		// Validate response structure
		const error = StrokePlayResultParser.validateResponse(ggResults)
		if (error) {
			result.errors.push(error)
			return
		}

		// Extract scopes (flights/divisions)
		const scopes = StrokePlayResultParser.extractScopes(ggResults)

		// Process each scope
		for (const scope of scopes) {
			const flightName = StrokePlayResultParser.extractFlightName(scope)
			const aggregates = StrokePlayResultParser.extractAggregates(scope)

			// Process each player result (only those who won money)
			for (const aggregate of aggregates) {
				try {
					await this.processStrokePlayerResult(tournamentData, aggregate, flightName, result)
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error)
					result.errors.push(`Error processing stroke player result: ${errorMessage}`)
					this.logger.error("Error processing stroke player result", {
						tournamentId: tournamentData.id,
						error: errorMessage,
					})
				}
			}
		}
	}
}

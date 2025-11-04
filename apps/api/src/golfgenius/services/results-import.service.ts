import { and, eq } from "drizzle-orm"

import { Injectable, Logger } from "@nestjs/common"

import { DrizzleService } from "../../database/drizzle.service"
import { tournament, tournamentResult } from "../../database/schema"
import { ApiClient } from "../api-client"
import { ImportResultSummary } from "../dto/tournament-results.dto"

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
		processor: (tournamentData: any, result: ImportResultSummary) => Promise<void>,
	): Promise<ImportResultSummary[]> {
		const tournaments = await this.drizzle.db
			.select()
			.from(tournament)
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
		tournamentData: any,
		processor: (tournamentData: any, result: ImportResultSummary) => Promise<void>,
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
			await processor(tournamentData, result)
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

	private validateTournament(tournamentData: any, result: ImportResultSummary): boolean {
		if (!tournamentData.ggId) {
			result.errors.push("Tournament must be synced with Golf Genius first")
			return false
		}
		// Add validation for event.gg_id and round.gg_id if needed
		return true
	}

	private async deleteExistingResults(tournamentData: any): Promise<void> {
		await this.drizzle.db
			.delete(tournamentResult)
			.where(eq(tournamentResult.tournamentId, tournamentData.id))

		this.logger.log("Deleted existing results", { tournamentId: tournamentData.id })
	}

	private async fetchGGResults(tournamentData: any, result: ImportResultSummary): Promise<any> {
		try {
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

	private async processPointsResults(): Promise<void> {
		// Implementation for points results processing
		// Maps to damcup_eventpoints table
		// TODO: Implement based on PointsResultParser
	}

	private async processSkinsResults(): Promise<void> {
		// Implementation for skins results processing
		// Maps to events_tournamentresult table
		// TODO: Implement based on SkinsResultParser
	}

	private async processProxyResults(): Promise<void> {
		// Implementation for proxy results processing
		// Maps to events_tournamentresult table
		// TODO: Implement based on ProxyResultParser
	}

	private async processStrokeResults(): Promise<void> {
		// Implementation for stroke play results processing (individual only)
		// Maps to events_tournamentresult table
		// TODO: Implement based on StrokePlayResultParser
	}
}

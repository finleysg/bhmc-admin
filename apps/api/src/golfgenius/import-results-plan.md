# Golf Genius Results Import - Implementation Guide

## Step 1: Create TypeScript DTOs

**File**: `apps/api/src/golfgenius/dto/tournament-results.dto.ts` (NEW)

```typescript
// Top-level response structure
export interface GolfGeniusTournamentResults {
	event: {
		name: string
		adjusted: boolean
		scopes: GGScope[]
		season_points?: any[]
		id: string
		id_str: string
	}
}

// Scope = Flight/Division
export interface GGScope {
	id: string
	id_str: string
	name?: string
	aggregates: GGAggregate[]
}

// Aggregate = Player/Team Result
export interface GGAggregate {
	id: string
	id_str: string
	member_ids: string[]
	member_ids_str: string[]
	member_cards: GGMemberCard[]
	scorecard_statuses: GGScorecardStatus[]
	position: string
	rank?: string
	name: string
	score?: string
	total?: string
	points?: string
	purse?: string
	details?: string
	stableford?: string | null
	disposition?: string
	disposition_cause?: string
	individual_results?: GGIndividualResult[]
	points_summary_team_id?: string | null
	team_id?: string
}

// Member Card = Player Identifier
export interface GGMemberCard {
	member_id: string
	member_id_str: string
	member_card_id: string
	member_card_id_str: string
}

export interface GGScorecardStatus {
	member_card_id: string
	member_card_id_str: string
	status: string
}

// For team events
export interface GGIndividualResult {
	member_id: string
	member_id_str: string
	name: string
	// ... other fields as needed
}

// Service response DTOs
export interface ImportResultSummary {
	tournamentId: number
	tournamentName: string
	eventName: string
	resultsImported: number
	errors: string[]
}

export interface ImportResult {
	tournament: string
	resultsImported: number
	errors: string[]
}
```

---

## Step 2: Update ApiClient

**File**: `apps/api/src/golfgenius/api-client.ts`

Add this method to the `ApiClient` class:

```typescript
import { GolfGeniusTournamentResults } from './dto/tournament-results.dto'

// Inside the ApiClient class:

async getTournamentResults(
  eventId: string,
  roundId: string,
  tournamentId: string,
): Promise<GolfGeniusTournamentResults> {
  const path = `/api_v2/${this.apiKey}/events/${eventId}/rounds/${roundId}/tournaments/${tournamentId}.json`

  try {
    const response = await this.httpService.axiosRef.get<GolfGeniusTournamentResults>(
      `${this.baseUrl}${path}`
    )
    return response.data
  } catch (error) {
    this.logger.error('Failed to fetch tournament results', {
      eventId,
      roundId,
      tournamentId,
      error: error.message,
    })
    throw new Error(`Failed to fetch tournament results: ${error.message}`)
  }
}
```

---

## Step 3: Create Result Parsers

**File**: `apps/api/src/golfgenius/services/result-parsers.ts` (NEW)

```typescript
import {
	GolfGeniusTournamentResults,
	GGScope,
	GGAggregate,
	GGMemberCard,
} from "../dto/tournament-results.dto"

/**
 * Base parser with common validation and extraction logic
 */
export class BaseResultParser {
	static validateResponse(ggResults: GolfGeniusTournamentResults): string | null {
		if (!ggResults?.event) {
			return "Invalid or empty results data from Golf Genius"
		}
		if (!ggResults.event.scopes) {
			return "No scopes found in results data"
		}
		return null
	}

	static extractScopes(ggResults: GolfGeniusTournamentResults): GGScope[] {
		return ggResults.event.scopes || []
	}

	static extractAggregates(scope: GGScope): GGAggregate[] {
		return scope.aggregates || []
	}

	static extractMemberCards(aggregate: GGAggregate): GGMemberCard[] {
		return aggregate.member_cards || []
	}

	static extractFlightName(scope: GGScope, defaultValue = "N/A"): string {
		return scope.name || defaultValue
	}
}

/**
 * Parser for points tournament results (saves to damcup_eventpoints)
 */
export class PointsResultParser extends BaseResultParser {
	static parsePlayerData(aggregate: GGAggregate, memberCard: GGMemberCard) {
		return {
			rank: aggregate.rank || "",
			points: aggregate.points || "",
			position: aggregate.position || "",
			total: aggregate.total || "",
			memberCardId: memberCard.member_card_id_str,
			playerName: aggregate.name || "Unknown",
		}
	}

	static formatPositionDetails(positionText: string): string {
		if (!positionText) return "No points awarded"

		if (positionText.startsWith("T")) {
			const tiePosition = parseInt(positionText.substring(1), 10)
			if (isNaN(tiePosition)) return "No points awarded"
			const ordinal = this.getOrdinalSuffix(tiePosition)
			return `Tied for ${tiePosition}${ordinal} place points`
		} else {
			const posNum = parseInt(positionText, 10)
			if (isNaN(posNum)) return "No points awarded"
			const ordinal = this.getOrdinalSuffix(posNum)
			return `${posNum}${ordinal} place points`
		}
	}

	private static getOrdinalSuffix(num: number): string {
		if (num >= 11 && num <= 13) return "th"
		const lastDigit = num % 10
		switch (lastDigit) {
			case 1:
				return "st"
			case 2:
				return "nd"
			case 3:
				return "rd"
			default:
				return "th"
		}
	}
}

/**
 * Parser for skins tournament results (saves to events_tournamentresult)
 */
export class SkinsResultParser extends BaseResultParser {
	static parsePlayerData(aggregate: GGAggregate, memberCard: GGMemberCard) {
		return {
			purse: aggregate.purse || "$0.00",
			total: aggregate.total || "",
			details: aggregate.details || null,
			memberCardId: memberCard.member_card_id_str,
			playerName: aggregate.name || "Unknown",
		}
	}
}

/**
 * Parser for proxy/user-scored tournament results (saves to events_tournamentresult)
 */
export class ProxyResultParser extends BaseResultParser {
	static parsePlayerData(aggregate: GGAggregate, memberCard: GGMemberCard) {
		return {
			purse: aggregate.purse || "$0.00",
			rank: aggregate.rank || "",
			memberCardId: memberCard.member_card_id_str,
			playerName: aggregate.name || "Unknown",
		}
	}
}

/**
 * Parser for stroke play tournament results (saves to events_tournamentresult)
 */
export class StrokePlayResultParser extends BaseResultParser {
	static parsePlayerData(aggregate: GGAggregate, memberCard: GGMemberCard) {
		return {
			purse: aggregate.purse || "$0.00",
			position: aggregate.position || "",
			total: aggregate.total || "",
			memberCardId: memberCard.member_card_id_str,
			playerName: aggregate.name || "Unknown",
		}
	}
}
```

---

## Step 4: Create Results Import Service

**File**: `apps/api/src/golfgenius/services/results-import.service.ts` (NEW)

```typescript
import { Injectable, Logger } from "@nestjs/common"
import { eq } from "drizzle-orm"
import { ApiClient } from "../api-client"
import { DrizzleService } from "../../database/drizzle.service"
import { tournament, tournamentResult, eventPoints } from "../../database/schema"
import {
	PointsResultParser,
	SkinsResultParser,
	ProxyResultParser,
	StrokePlayResultParser,
} from "./result-parsers"
import { ImportResultSummary } from "../dto/tournament-results.dto"

@Injectable()
export class ResultsImportService {
	private readonly logger = new Logger(ResultsImportService.name)

	constructor(
		private readonly apiClient: ApiClient,
		private readonly db: DrizzleService,
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
		const tournaments = await this.db.client
			.select()
			.from(tournament)
			.where(eq(tournament.eventId, eventId))
			.where(eq(tournament.format, format))

		if (tournaments.length === 0) {
			this.logger.warn(`No ${format} tournaments found for event`, { eventId })
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
			result.errors.push(`Unexpected error: ${error.message}`)
			this.logger.error("Unexpected error importing results", {
				tournamentId: tournamentData.id,
				error: error.message,
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
		await this.db.client
			.delete(tournamentResult)
			.where(eq(tournamentResult.tournamentId, tournamentData.id))

		this.logger.info("Deleted existing results", { tournamentId: tournamentData.id })
	}

	private async fetchGGResults(tournamentData: any, result: ImportResultSummary): Promise<any> {
		try {
			return await this.apiClient.getTournamentResults(
				tournamentData.eventGgId,
				tournamentData.roundGgId,
				tournamentData.ggId,
			)
		} catch (error) {
			result.errors.push(`Failed to fetch from Golf Genius: ${error.message}`)
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
		} catch (error) {
			this.logger.warn("Failed to parse purse amount", { purseStr })
			return null
		}
	}

	// ============= FORMAT-SPECIFIC PROCESSORS =============

	private async processPointsResults(
		tournamentData: any,
		result: ImportResultSummary,
	): Promise<void> {
		// Implementation for points results processing
		// Maps to damcup_eventpoints table
		// TODO: Implement based on PointsResultParser
	}

	private async processSkinsResults(
		tournamentData: any,
		result: ImportResultSummary,
	): Promise<void> {
		// Implementation for skins results processing
		// Maps to events_tournamentresult table
		// TODO: Implement based on SkinsResultParser
	}

	private async processProxyResults(
		tournamentData: any,
		result: ImportResultSummary,
	): Promise<void> {
		// Implementation for proxy results processing
		// Maps to events_tournamentresult table
		// TODO: Implement based on ProxyResultParser
	}

	private async processStrokeResults(
		tournamentData: any,
		result: ImportResultSummary,
	): Promise<void> {
		// Implementation for stroke play results processing (individual only)
		// Maps to events_tournamentresult table
		// TODO: Implement based on StrokePlayResultParser
	}
}
```

---

## Step 5: Update Controller

**File**: `apps/api/src/golfgenius/golfgenius.controller.ts`

Add to constructor:

```typescript
private readonly resultsImport: ResultsImportService,
```

Add these endpoints:

```typescript
@Post("/events/:id/import-points")
@UseInterceptors(LogIntegrationInterceptor)
async importPoints(@Param("id") id: string) {
  const eid = parseInt(id, 10)
  return this.resultsImport.importPointsResults(eid)
}

@Post("/events/:id/import-skins")
@UseInterceptors(LogIntegrationInterceptor)
async importSkins(@Param("id") id: string) {
  const eid = parseInt(id, 10)
  return this.resultsImport.importSkinsResults(eid)
}

@Post("/events/:id/import-proxy")
@UseInterceptors(LogIntegrationInterceptor)
async importProxy(@Param("id") id: string) {
  const eid = parseInt(id, 10)
  return this.resultsImport.importProxyResults(eid)
}

@Post("/events/:id/import-stroke")
@UseInterceptors(LogIntegrationInterceptor)
async importStroke(@Param("id") id: string) {
  const eid = parseInt(id, 10)
  return this.resultsImport.importStrokePlayResults(eid)
}
```

---

## Step 6: Update GolfgeniusModule

**File**: `apps/api/src/golfgenius/golfgenius.module.ts`

Add to providers:

```typescript
import { ResultsImportService } from './services/results-import.service'

@Module({
  providers: [
    // ... existing providers ...
    ResultsImportService,
  ],
  // ... rest of module ...
})
```

---

## Step 7: Update Integration Log Types

**File**: `apps/api/src/database/schema/golf-genius.schema.ts`

Update the integrationType field:

```typescript
integrationType: varchar("integration_type", { length: 30 })
  .notNull()
  .$type<
    | "Member Sync"
    | "Event Sync"
    | "Roster Export"
    | "Import Scores"
    | "Import Points Results"
    | "Import Skins Results"
    | "Import Proxy Results"
    | "Import Stroke Play Results"
  >(),
```

---

## Step 8: Create Unit Tests

**File**: `apps/api/src/golfgenius/services/__tests__/result-parsers.spec.ts` (NEW)

```typescript
import { PointsResultParser, SkinsResultParser } from "../result-parsers"
import pointsExample from "../../json/points-example.json"
import skinsExample from "../../json/skins-example.json"

describe("PointsResultParser", () => {
	it("should validate valid points response", () => {
		const error = PointsResultParser.validateResponse(pointsExample)
		expect(error).toBeNull()
	})

	it("should extract scopes from points response", () => {
		const scopes = PointsResultParser.extractScopes(pointsExample)
		expect(scopes).toHaveLength(1)
		expect(scopes[0]).toHaveProperty("aggregates")
	})

	it("should parse player data correctly", () => {
		const scopes = PointsResultParser.extractScopes(pointsExample)
		const aggregates = PointsResultParser.extractAggregates(scopes[0])
		const memberCards = PointsResultParser.extractMemberCards(aggregates[0])

		const playerData = PointsResultParser.parsePlayerData(aggregates[0], memberCards[0])

		expect(playerData).toHaveProperty("rank")
		expect(playerData).toHaveProperty("points")
		expect(playerData).toHaveProperty("memberCardId")
	})

	it("should format tied position correctly", () => {
		const result = PointsResultParser.formatPositionDetails("T1")
		expect(result).toBe("Tied for 1st place points")
	})

	it("should format regular position correctly", () => {
		const result = PointsResultParser.formatPositionDetails("21")
		expect(result).toBe("21st place points")
	})
})

// Add similar tests for Skins, Proxy, and StrokePay parsers
```

---

## Implementation Order

1. Create DTOs (Step 1)
2. Update ApiClient (Step 2)
3. Create Parsers (Step 3)
4. Create Service skeleton (Step 4) - leave processors as TODOs
5. Update Controller (Step 5)
6. Update Module (Step 6)
7. Update integration log types (Step 7)
8. Implement one processor at a time, starting with Points
9. Write unit tests for each (Step 8)
10. Test each endpoint manually
11. Iterate and refine

## Notes

- The service skeleton is provided but the actual processor implementations need to be filled in based on the parsers
- Each processor will need to query players, parse results, and insert into the appropriate table
- Follow the Python implementation logic for each format
- Use Drizzle ORM for all database operations
- Include proper error handling and logging throughout

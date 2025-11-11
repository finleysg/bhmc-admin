import {
	and,
	eq,
	inArray,
} from "drizzle-orm"

import {
	Injectable,
	Logger,
} from "@nestjs/common"
import {
	PreparedTournamentPoints,
	PreparedTournamentResult,
	TournamentData,
} from "@repo/dto"

import {
	DrizzleService,
	event,
	eventFee,
	feeType,
	round,
	tournament,
	tournamentPoints,
	tournamentResult,
} from "../database"
import { EventFeeWithTypeDto } from "./dto/event-fee.dto"
import { EventDto } from "./dto/event.dto"
import {
	mapToEventDto,
	mapToEventFeeWithTypeDto,
	mapToRoundDto,
	mapToTournamentDto,
} from "./dto/mappers"
import { RoundDto } from "./dto/round.dto"
import { TournamentDto } from "./dto/tournament.dto"
import { UpdateEventDto } from "./dto/update-event.dto"

@Injectable()
export class EventsService {
	private readonly logger = new Logger(EventsService.name)

	constructor(private drizzle: DrizzleService) {}

	// events_event
	async findEventById(id: number): Promise<EventDto | null> {
		const [evt] = await this.drizzle.db.select().from(event).where(eq(event.id, id)).limit(1)
		return evt ? mapToEventDto(evt) : null
	}

	async findEventsByDate(date: string): Promise<EventDto[]> {
		const results = await this.drizzle.db.select().from(event).where(eq(event.startDate, date))
		return results.map(mapToEventDto)
	}

	async updateEvent(id: number, data: UpdateEventDto) {
		await this.drizzle.db
			.update(event)
			.set(data as any)
			.where(eq(event.id, id))
		return this.findEventById(id)
	}

	// events_event_fees
	async listEventFeesByEvent(id: number): Promise<EventFeeWithTypeDto[]> {
		const results = await this.drizzle.db
			.select({ eventFee: eventFee, feeType: feeType })
			.from(eventFee)
			.innerJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
			.where(eq(eventFee.eventId, id))

		return results.map(mapToEventFeeWithTypeDto)
	}

	// events_round
	async createRound(data: RoundDto) {
		const [result] = await this.drizzle.db.insert(round).values(data as any)
		return this.findRoundById(Number(result.insertId))
	}

	async findRoundById(id: number): Promise<RoundDto | null> {
		const [rnd] = await this.drizzle.db.select().from(round).where(eq(round.id, id)).limit(1)
		return rnd ? mapToRoundDto(rnd) : null
	}

	async findRoundsByEventId(event_id: number): Promise<RoundDto[]> {
		const results = await this.drizzle.db.select().from(round).where(eq(round.eventId, event_id))
		return results.map(mapToRoundDto)
	}

	// evenrndts_tournament
	async createTournament(data: TournamentDto) {
		const [result] = await this.drizzle.db.insert(tournament).values(data as any)
		return this.findTournamentById(Number(result.insertId))
	}

	async findTournamentById(id: number): Promise<TournamentDto | null> {
		const [tourney] = await this.drizzle.db
			.select()
			.from(tournament)
			.where(eq(tournament.id, id))
			.limit(1)
		return tourney ? mapToTournamentDto(tourney) : null
	}

	async findTournamentsByEventId(event_id: number): Promise<TournamentDto[]> {
		const results = await this.drizzle.db
			.select()
			.from(tournament)
			.where(eq(tournament.eventId, event_id))
		return results.map(mapToTournamentDto)
	}

	/**
	 * Get tournaments by event ID and format for Golf Genius integration.
	 * Returns tournament data with associated event and round Golf Genius IDs.
	 */
	async getTournamentsByEventAndFormat(eventId: number, format: string): Promise<TournamentData[]> {
		return this.drizzle.db
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
	}

	/**
	 * Bulk delete all tournaments for an event.
	 * Returns the number of rows deleted when available.
	 */
	async deleteTournamentsByEventId(event_id: number) {
		const res = await this.drizzle.db.delete(tournament).where(eq(tournament.eventId, event_id))
		const r = res as unknown as { affectedRows?: number; affected_rows?: number }
		return r.affectedRows ?? r.affected_rows ?? 0
	}

	/**
	 * Bulk delete all rounds for an event.
	 * Returns the number of rows deleted when available.
	 */
	async deleteRoundsByEventId(event_id: number) {
		const res = await this.drizzle.db.delete(round).where(eq(round.eventId, event_id))
		const r = res as unknown as { affectedRows?: number; affected_rows?: number }
		return r.affectedRows ?? r.affected_rows ?? 0
	}

	/**
	 * Close an event by confirming all tournament result payouts.
	 * Updates payoutStatus to "Confirmed" and payoutDate to current timestamp.
	 * Validates that the event has tournaments and results, and is not already closed.
	 */
	async closeEvent(eventId: number) {
		// Find all tournaments for this event
		const tournaments = await this.findTournamentsByEventId(eventId)

		// Validate: Event must have tournaments
		if (tournaments.length === 0) {
			throw new Error("Cannot close event: No tournaments found")
		}

		// Get tournament IDs (filter out undefined)
		const tournamentIds = tournaments
			.map((t) => t.id)
			.filter((id): id is number => id !== undefined)

		// Check for existing results
		const results = await this.drizzle.db
			.select()
			.from(tournamentResult)
			.where(inArray(tournamentResult.tournamentId, tournamentIds))

		// Validate: Must have results to close
		if (results.length === 0) {
			throw new Error("Cannot close event: No tournament results found")
		}

		// Validate: Event must not already be closed
		if (results.some((r) => r.payoutStatus === "Confirmed")) {
			throw new Error("Event is already closed")
		}

		// Update all results
		const now = new Date().toISOString().slice(0, 19).replace("T", " ")
		await this.drizzle.db
			.update(tournamentResult)
			.set({
				payoutStatus: "Confirmed",
				payoutDate: now,
			})
			.where(inArray(tournamentResult.tournamentId, tournamentIds))

		return {
			eventId,
			resultsUpdated: results.length,
			payoutDate: now,
		}
	}

	/**
	 * Delete existing tournament results and points for a tournament.
	 * Used during Golf Genius result imports to ensure idempotent operations.
	 */
	async deleteTournamentResults(tournamentId: number): Promise<void> {
		await this.drizzle.db
			.delete(tournamentResult)
			.where(eq(tournamentResult.tournamentId, tournamentId))
		await this.drizzle.db
			.delete(tournamentPoints)
			.where(eq(tournamentPoints.tournamentId, tournamentId))

		this.logger.log("Deleted existing results", { tournamentId })
	}

	/**
	 * Delete existing tournament points for a tournament.
	 * Used during Golf Genius points imports to ensure idempotent operations.
	 */
	async deleteTournamentPoints(tournamentId: number): Promise<void> {
		await this.drizzle.db
			.delete(tournamentPoints)
			.where(eq(tournamentPoints.tournamentId, tournamentId))

		this.logger.log("Deleted existing points", { tournamentId })
	}

	/**
	 * Batch insert tournament points.
	 * Used during Golf Genius result imports to efficiently insert multiple records.
	 */
	async insertTournamentPoints(results: PreparedTournamentPoints[]): Promise<void> {
		if (results.length > 0) {
			await this.drizzle.db.insert(tournamentPoints).values(results)
			this.logger.debug(`Batch inserted results: ${results.length} records`)
		}
	}

	/**
	 * Batch insert tournament results.
	 * Used during Golf Genius result imports to efficiently insert multiple records.
	 */
	async insertTournamentResults(results: PreparedTournamentResult[]): Promise<void> {
		if (results.length > 0) {
			try {
				await this.drizzle.db.insert(tournamentResult).values(results)
				this.logger.debug(`Batch inserted results: ${results.length} records`)
			} catch (error) {
				console.error("Full database error:", error)
				if (error instanceof Error) {
					console.error("Error message:", error.message)
					console.error("Error code:", (error as any).code)
					console.error("Error sqlMessage:", (error as any).sqlMessage)
				}
				throw error
			}
		}
	}
}

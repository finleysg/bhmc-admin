import { count, eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

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
import {
	EventFeeModel,
	EventModel,
	eventUpdateSchema,
	roundInsertSchema,
	RoundModel,
	tournamentInsertSchema,
	TournamentModel,
	tournamentPointsInsertSchema,
	TournamentPointsModel,
	tournamentResultInsertSchema,
	TournamentResultModel,
} from "../database/models"
import {
	mapToEventFeeModel,
	mapToEventModel,
	mapToFeeTypeModel,
	mapToRoundModel,
	mapToTournamentModel,
} from "./mappers"

@Injectable()
export class EventsRepository {
	constructor(private drizzle: DrizzleService) {}

	// events_event
	async findEventById(eventId: number): Promise<EventModel> {
		const [evt] = await this.drizzle.db.select().from(event).where(eq(event.id, eventId)).limit(1)
		if (!evt) {
			throw new Error(`No event found with id ${eventId}`)
		}

		return mapToEventModel(evt)
	}

	async existsById(eventId: number): Promise<boolean> {
		const result = await this.drizzle.db
			.select({ count: count() })
			.from(event)
			.where(eq(event.id, eventId))
		return result[0].count > 0
	}

	async findEventsByDate(date: string): Promise<EventModel[]> {
		const results = await this.drizzle.db.select().from(event).where(eq(event.startDate, date))
		return results.map(mapToEventModel)
	}

	async updateEvent(id: number, data: EventModel) {
		const entity = eventUpdateSchema.parse(data)
		await this.drizzle.db.update(event).set(entity).where(eq(event.id, id))
		return this.findEventById(id)
	}

	// events_event_fees
	async listEventFeesByEvent(id: number): Promise<EventFeeModel[]> {
		const results = await this.drizzle.db
			.select({ eventFee: eventFee, feeType: feeType })
			.from(eventFee)
			.innerJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
			.where(eq(eventFee.eventId, id))

		return results.map((r) => {
			const fee = mapToEventFeeModel(r.eventFee)
			fee.feeType = mapToFeeTypeModel(r.feeType)
			return fee
		})
	}

	// events_round
	async createRound(data: RoundModel) {
		const entity = roundInsertSchema.parse(data)
		const [result] = await this.drizzle.db.insert(round).values(entity)
		return this.findRoundById(Number(result.insertId))
	}

	async findRoundById(id: number): Promise<RoundModel> {
		const [rnd] = await this.drizzle.db.select().from(round).where(eq(round.id, id)).limit(1)
		if (!rnd) {
			throw new Error(`No round found with id ${id}`)
		}
		return mapToRoundModel(rnd)
	}

	async findRoundsByEventId(event_id: number): Promise<RoundModel[]> {
		const results = await this.drizzle.db.select().from(round).where(eq(round.eventId, event_id))
		return results.map(mapToRoundModel)
	}

	async createTournament(data: TournamentModel) {
		const entity = tournamentInsertSchema.parse(data)
		const [result] = await this.drizzle.db.insert(tournament).values(entity)
		return this.findTournamentById(Number(result.insertId))
	}

	async findTournamentById(id: number): Promise<TournamentModel> {
		const [tourney] = await this.drizzle.db
			.select()
			.from(tournament)
			.where(eq(tournament.id, id))
			.limit(1)
		if (!tourney) {
			throw new Error(`No tournament found with id ${id}`)
		}
		return mapToTournamentModel(tourney)
	}

	async findTournamentsByEventId(eventId: number): Promise<TournamentModel[]> {
		const results = await this.drizzle.db
			.select()
			.from(tournament)
			.where(eq(tournament.eventId, eventId))
		return results.map(mapToTournamentModel)
	}

	/**
	 * Bulk delete all tournaments for an event.
	 * Returns the number of rows deleted when available.
	 */
	async deleteTournamentsByEventId(eventId: number) {
		const res = await this.drizzle.db.delete(tournament).where(eq(tournament.eventId, eventId))
		const r = res as unknown as { affectedRows?: number; affected_rows?: number }
		return r.affectedRows ?? r.affected_rows ?? 0
	}

	/**
	 * Bulk delete all rounds for an event.
	 * Returns the number of rows deleted when available.
	 */
	async deleteRoundsByEventId(eventId: number) {
		const res = await this.drizzle.db.delete(round).where(eq(round.eventId, eventId))
		const r = res as unknown as { affectedRows?: number; affected_rows?: number }
		return r.affectedRows ?? r.affected_rows ?? 0
	}

	/**
	 * Delete existing tournament results and points for a tournament.
	 * Used during Golf Genius result imports to ensure idempotent operations.
	 */
	async deleteTournamentResults(tournamentId: number): Promise<void> {
		await this.drizzle.db
			.delete(tournamentResult)
			.where(eq(tournamentResult.tournamentId, tournamentId))
	}

	/**
	 * Delete existing tournament points for a tournament.
	 * Used during Golf Genius points imports to ensure idempotent operations.
	 */
	async deleteTournamentPoints(tournamentId: number): Promise<void> {
		await this.drizzle.db
			.delete(tournamentPoints)
			.where(eq(tournamentPoints.tournamentId, tournamentId))
	}

	/**
	 * Batch insert tournament points.
	 */
	async insertTournamentPoints(points: TournamentPointsModel[]): Promise<void> {
		if (points.length > 0) {
			const data = points.map((p) => tournamentPointsInsertSchema.parse(p))
			await this.drizzle.db.insert(tournamentPoints).values(data)
		}
	}

	/**
	 * Batch insert tournament results.
	 */
	async insertTournamentResults(results: TournamentResultModel[]): Promise<void> {
		if (results.length > 0) {
			const data = results.map((r) => tournamentResultInsertSchema.parse(r))
			await this.drizzle.db.insert(tournamentResult).values(data)
		}
	}
}

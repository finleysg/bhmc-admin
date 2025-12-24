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
	type EventRow,
	type EventFeeRow,
	type FeeTypeRow,
	type RoundRow,
	type TournamentRow,
	type TournamentPointsInsert,
	type TournamentResultInsert,
	type RoundInsert,
	type TournamentInsert,
} from "../database"

@Injectable()
export class EventsRepository {
	constructor(private drizzle: DrizzleService) {}

	// events_event
	async findEventById(eventId: number): Promise<EventRow> {
		const [evt] = await this.drizzle.db.select().from(event).where(eq(event.id, eventId)).limit(1)
		if (!evt) {
			throw new Error(`No event found with id ${eventId}`)
		}
		return evt
	}

	async existsById(eventId: number): Promise<boolean> {
		const result = await this.drizzle.db
			.select({ count: count() })
			.from(event)
			.where(eq(event.id, eventId))
		return result[0].count > 0
	}

	async findEventsByDate(date: string): Promise<EventRow[]> {
		return this.drizzle.db.select().from(event).where(eq(event.startDate, date))
	}

	async updateEvent(id: number, data: Partial<EventRow>) {
		await this.drizzle.db.update(event).set(data).where(eq(event.id, id))
		return this.findEventById(id)
	}

	// events_event_fees
	async listEventFeesByEvent(
		id: number,
	): Promise<{ eventFee: EventFeeRow; feeType: FeeTypeRow }[]> {
		return this.drizzle.db
			.select({ eventFee: eventFee, feeType: feeType })
			.from(eventFee)
			.innerJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
			.where(eq(eventFee.eventId, id))
	}

	// events_round
	async createRound(data: RoundInsert): Promise<RoundRow> {
		const [result] = await this.drizzle.db.insert(round).values(data)
		return this.findRoundById(Number(result.insertId))
	}

	async findRoundById(id: number): Promise<RoundRow> {
		const [rnd] = await this.drizzle.db.select().from(round).where(eq(round.id, id)).limit(1)
		if (!rnd) {
			throw new Error(`No round found with id ${id}`)
		}
		return rnd
	}

	async findRoundsByEventId(eventId: number): Promise<RoundRow[]> {
		return this.drizzle.db.select().from(round).where(eq(round.eventId, eventId))
	}

	// events_tournament
	async createTournament(data: TournamentInsert): Promise<TournamentRow> {
		const [result] = await this.drizzle.db.insert(tournament).values(data)
		return this.findTournamentById(Number(result.insertId))
	}

	async findTournamentById(id: number): Promise<TournamentRow> {
		const [tourney] = await this.drizzle.db
			.select()
			.from(tournament)
			.where(eq(tournament.id, id))
			.limit(1)
		if (!tourney) {
			throw new Error(`No tournament found with id ${id}`)
		}
		return tourney
	}

	async findTournamentsByEventId(eventId: number): Promise<TournamentRow[]> {
		return this.drizzle.db.select().from(tournament).where(eq(tournament.eventId, eventId))
	}

	async deleteTournamentsByEventId(eventId: number): Promise<number> {
		const res = await this.drizzle.db.delete(tournament).where(eq(tournament.eventId, eventId))
		const r = res as unknown as { affectedRows?: number; affected_rows?: number }
		return r.affectedRows ?? r.affected_rows ?? 0
	}

	async deleteRoundsByEventId(eventId: number): Promise<number> {
		const res = await this.drizzle.db.delete(round).where(eq(round.eventId, eventId))
		const r = res as unknown as { affectedRows?: number; affected_rows?: number }
		return r.affectedRows ?? r.affected_rows ?? 0
	}

	async deleteTournamentResults(tournamentId: number): Promise<void> {
		await this.drizzle.db
			.delete(tournamentResult)
			.where(eq(tournamentResult.tournamentId, tournamentId))
	}

	async deleteTournamentPoints(tournamentId: number): Promise<void> {
		await this.drizzle.db
			.delete(tournamentPoints)
			.where(eq(tournamentPoints.tournamentId, tournamentId))
	}

	async insertTournamentPoints(points: TournamentPointsInsert[]): Promise<void> {
		if (points.length > 0) {
			await this.drizzle.db.insert(tournamentPoints).values(points)
		}
	}

	async insertTournamentResults(results: TournamentResultInsert[]): Promise<void> {
		if (results.length > 0) {
			await this.drizzle.db.insert(tournamentResult).values(results)
		}
	}
}

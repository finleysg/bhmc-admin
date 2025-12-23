import { and, eq, inArray } from "drizzle-orm"

import { BadRequestException, Injectable } from "@nestjs/common"
import { validateClubEvent } from "@repo/domain/functions"
import {
	PreparedTournamentPoints,
	PreparedTournamentResult,
	TournamentResults,
	ValidatedClubEvent,
} from "@repo/domain/types"

import { CoursesRepository } from "../courses"
import { DrizzleService, player, toDbString, tournamentResult } from "../database"
import {
	mapPreparedPointsToTournamentPointsInsert,
	mapPreparedResultsToTournamentResultInsert,
} from "../golfgenius/dto/mappers"
import { toPlayer } from "../registration/mappers"
import { EventsRepository } from "./events.repository"
import {
	toEventWithCompositions,
	toEventFeeWithType,
	toRound,
	toTournament,
	toTournamentResults,
} from "./mappers"

@Injectable()
export class EventsService {
	constructor(
		private drizzle: DrizzleService,
		private readonly repository: EventsRepository,
		private readonly courses: CoursesRepository,
	) {}

	async getValidatedClubEventById(
		eventId: number,
		requireIntegration: boolean | undefined = true,
	): Promise<ValidatedClubEvent> {
		const eventRow = await this.repository.findEventById(eventId)
		if (!eventRow) throw new BadRequestException(`Event with id ${eventId} does not exist.`)

		const courseRows = await this.courses.findCoursesByEventId({
			eventId: eventId,
			includeHoles: true,
			includeTees: true,
		})
		const eventFeeRows = await this.repository.listEventFeesByEvent(eventId)
		const roundRows = await this.repository.findRoundsByEventId(eventId)
		const tournamentRows = await this.repository.findTournamentsByEventId(eventId)

		const clubEvent = toEventWithCompositions(eventRow, {
			courses: courseRows,
			eventFees: eventFeeRows.map(toEventFeeWithType),
			eventRounds: roundRows.map(toRound),
			tournaments: tournamentRows.map(toTournament),
		})

		return validateClubEvent(clubEvent, requireIntegration)
	}

	async exists(eventId: number): Promise<boolean> {
		return this.repository.existsById(eventId)
	}

	async syncEventToGolfGenius(id: number, ggId: string, portalUrl: string) {
		await this.repository.updateEvent(id, { ggId, portalUrl })
	}

	async findTournamentWinners(tournamentId: number): Promise<TournamentResults[]> {
		const results = await this.drizzle.db
			.select({
				result: tournamentResult,
				player: player,
			})
			.from(tournamentResult)
			.innerJoin(player, eq(tournamentResult.playerId, player.id))
			.where(and(eq(tournamentResult.tournamentId, tournamentId), eq(tournamentResult.position, 1)))
			.orderBy(tournamentResult.flight)

		return results.map((row) => toTournamentResults(row.result, toPlayer(row.player)))
	}

	async closeEvent(eventId: number) {
		const tournaments = await this.repository.findTournamentsByEventId(eventId)
		if (tournaments.length === 0) {
			throw new Error("Cannot close event: No tournaments found")
		}

		const tournamentIds = tournaments.map((t) => t.id)
		const now = toDbString(new Date())

		await this.drizzle.db
			.update(tournamentResult)
			.set({
				payoutStatus: "Confirmed",
				payoutDate: now,
			})
			.where(inArray(tournamentResult.tournamentId, tournamentIds))

		return { success: true }
	}

	async deleteTournamentPoints(tournamentId: number) {
		await this.repository.deleteTournamentPoints(tournamentId)
	}

	async deleteTournamentResults(tournamentId: number): Promise<void> {
		await this.repository.deleteTournamentResults(tournamentId)
	}

	async insertTournamentResults(preparedRecords: PreparedTournamentResult[]): Promise<void> {
		const records = preparedRecords.map((record) =>
			mapPreparedResultsToTournamentResultInsert(record),
		)
		await this.repository.insertTournamentResults(records)
	}

	async insertTournamentPoints(preparedRecords: PreparedTournamentPoints[]): Promise<void> {
		const records = preparedRecords.map((record) =>
			mapPreparedPointsToTournamentPointsInsert(record),
		)
		await this.repository.insertTournamentPoints(records)
	}
}

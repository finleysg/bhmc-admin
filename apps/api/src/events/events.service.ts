import {
	and,
	eq,
	inArray,
} from "drizzle-orm"

import {
	BadRequestException,
	Injectable,
} from "@nestjs/common"
import { validateClubEvent } from "@repo/domain/functions"
import {
	PreparedTournamentPoints,
	PreparedTournamentResult,
	ValidatedClubEvent,
} from "@repo/domain/types"

import { CoursesRepository } from "../courses"
import {
	DrizzleService,
	player,
	tournamentResult,
} from "../database"
import { TournamentResultModel } from "../database/models"
import {
	mapPreparedPointsToTournamentPointsModel,
	mapPreparedResultsToTournamentResultModel,
} from "../golfgenius/dto/mappers"
import { mapToPlayerModel } from "../registration/mappers"
import { EventsRepository } from "./events.repository"
import {
	mapToTournamentResultModel,
	toEvent,
} from "./mappers"

@Injectable()
export class EventsService {
	constructor(
		private drizzle: DrizzleService,
		private readonly repository: EventsRepository,
		private readonly courses: CoursesRepository,
	) {}

	async getValidatedClubEventById(eventId: number): Promise<ValidatedClubEvent> {
		const clubEvent = await this.repository.findEventById(eventId)
		if (!clubEvent) throw new BadRequestException(`Event with id ${eventId} does not exist.`)

		clubEvent.courses = await this.courses.findCoursesByEventId({
			eventId: eventId,
			includeHoles: true,
			includeTees: true,
		})
		clubEvent.eventFees = await this.repository.listEventFeesByEvent(eventId)
		clubEvent.eventRounds = await this.repository.findRoundsByEventId(eventId)
		clubEvent.tournaments = await this.repository.findTournamentsByEventId(eventId)

		return validateClubEvent(toEvent(clubEvent))
	}

	async exists(eventId: number): Promise<boolean> {
		return this.repository.existsById(eventId)
	}

	async syncEventToGolfGenius(id: number, ggId: string, portalUrl: string) {
		const event = await this.repository.findEventById(id)
		event.ggId = ggId
		event.portalUrl = portalUrl

		await this.repository.updateEvent(id, event)
	}

	async findTournamentWinners(tournamentId: number): Promise<TournamentResultModel[]> {
		const results = await this.drizzle.db
			.select({
				result: tournamentResult,
				player: player,
			})
			.from(tournamentResult)
			.innerJoin(player, eq(tournamentResult.playerId, player.id))
			.where(and(eq(tournamentResult.tournamentId, tournamentId), eq(tournamentResult.position, 1)))
			.orderBy(tournamentResult.flight)

		return results.map((row) => {
			const winner = mapToTournamentResultModel(row.result)
			winner.player = mapToPlayerModel(row.player)
			return winner
		})
	}

	/**
	 * Close an event by confirming all tournament result payouts.
	 * Updates payoutStatus to "Confirmed" and payoutDate to current timestamp.
	 */
	async closeEvent(eventId: number) {
		const tournaments = await this.repository.findTournamentsByEventId(eventId)
		if (tournaments.length === 0) {
			throw new Error("Cannot close event: No tournaments found")
		}

		const tournamentIds = tournaments.map((t) => t.id!)
		const now = new Date().toISOString().slice(0, 19).replace("T", " ")

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
			mapPreparedResultsToTournamentResultModel(record),
		)
		await this.repository.insertTournamentResults(records)
	}

	async insertTournamentPoints(preparedRecords: PreparedTournamentPoints[]): Promise<void> {
		const records = preparedRecords.map((record) =>
			mapPreparedPointsToTournamentPointsModel(record),
		)
		await this.repository.insertTournamentPoints(records)
	}
}

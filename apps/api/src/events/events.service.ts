import { and, eq, inArray } from "drizzle-orm"

import { BadRequestException, Injectable, Logger } from "@nestjs/common"
import { validateClubEvent } from "@repo/domain/functions"
import {
	ClubEvent,
	EventFeeWithType,
	PreparedTournamentPoints,
	PreparedTournamentResult,
	TournamentResults,
	CompleteClubEvent,
} from "@repo/domain/types"

import { CoursesService } from "../courses"
import { DrizzleService, player, toDbString, tournamentResult } from "../database"
import {
	mapPreparedPointsToTournamentPointsInsert,
	mapPreparedResultsToTournamentResultInsert,
} from "../golfgenius/dto/mappers"
import { toPlayer } from "../registration/mappers"
import { EventsRepository } from "./events.repository"
import {
	toEvent,
	toEventWithCompositions,
	toEventFeeWithType,
	toRound,
	toTournament,
	toTournamentResults,
} from "./mappers"

@Injectable()
export class EventsService {
	private readonly logger = new Logger(EventsService.name)

	constructor(
		private drizzle: DrizzleService,
		private readonly repository: EventsRepository,
		private readonly courses: CoursesService,
	) {}

	async getCompleteClubEventById(
		eventId: number,
		requireIntegration: boolean | undefined = true,
	): Promise<CompleteClubEvent> {
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
		this.logger.debug(`Found ${tournamentRows.length} tournaments for event ${eventId}`)

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

	async getEventById(eventId: number): Promise<ClubEvent> {
		const row = await this.repository.findEventById(eventId)
		if (!row) throw new BadRequestException(`Event ${eventId} not found`)
		return toEvent(row)
	}

	async getEventsBySeason(season: number): Promise<ClubEvent[]> {
		const events = await this.repository.findEventsBySeason(season)
		return events.map((e) => toEvent(e))
	}

	async getSeasonRegistrationEventId(season: number): Promise<number> {
		const evt = await this.repository.findSeasonRegistrationEvent(season)
		if (!evt) throw new BadRequestException(`No season registration event found for ${season}`)
		return evt.id
	}

	async getEventFeesByEventId(eventId: number): Promise<EventFeeWithType[]> {
		const result = await this.repository.listEventFeesByEvent(eventId)
		return result.map(toEventFeeWithType)
	}

	async isCanChooseHolesEvent(eventId: number): Promise<boolean> {
		const event = await this.repository.findEventById(eventId)
		if (!event) {
			throw new BadRequestException(`Event with id ${eventId} does not exist.`)
		}
		return event.canChoose === 1
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
		const records = preparedRecords.map((record) => {
			record.summary = this.truncateField(record.summary, 120, "summary")
			record.details = this.truncateField(record.details, 120, "details")
			return mapPreparedResultsToTournamentResultInsert(record)
		})
		await this.repository.insertTournamentResults(records)
	}

	private truncateField(value: string | null, maxLen: number, field: string): string | null {
		if (!value || value.length <= maxLen) return value
		this.logger.warn(`Truncating ${field} from ${value.length} to ${maxLen} chars`)
		return value.substring(0, maxLen)
	}

	async insertTournamentPoints(preparedRecords: PreparedTournamentPoints[]): Promise<void> {
		const records = preparedRecords.map((record) =>
			mapPreparedPointsToTournamentPointsInsert(record),
		)
		await this.repository.insertTournamentPoints(records)
	}
}

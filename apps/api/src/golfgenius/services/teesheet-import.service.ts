import { Subject } from "rxjs"

import { Inject, Injectable, Logger } from "@nestjs/common"
import { PlayerProgressEvent } from "@repo/domain/types"

import { CoursesService } from "../../courses/courses.service"
import { EventsRepository } from "../../events/events.repository"
import { ApiClient } from "../api-client"
import { GgPairingGroup } from "../api-data"
import { ImportError, ImportResult } from "../dto"
import { PairingRepository } from "./pairing.repository"
import { ProgressTracker } from "./progress-tracker"

@Injectable()
export class TeesheetImportService {
	private readonly logger = new Logger(TeesheetImportService.name)

	constructor(
		@Inject(EventsRepository) private readonly events: EventsRepository,
		@Inject(CoursesService) private readonly courses: CoursesService,
		@Inject(ApiClient) private readonly apiClient: ApiClient,
		@Inject(ProgressTracker) private readonly progressTracker: ProgressTracker,
		@Inject(PairingRepository) private readonly pairings: PairingRepository,
	) {}

	getProgressObservable(eventId: number): Subject<PlayerProgressEvent> | null {
		return this.progressTracker.getProgressObservable(
			eventId,
		) as Subject<PlayerProgressEvent> | null
	}

	importTeesheet(eventId: number): Subject<PlayerProgressEvent> {
		const subject = this.progressTracker.startTracking(eventId, 0) as Subject<PlayerProgressEvent>

		this.processImportAsync(eventId).catch((error: unknown) => {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.logger.error(`Teesheet import failed for event ${eventId}`, errorMessage)
			void this.progressTracker.errorOperation(eventId, "Import Teesheet", errorMessage)
		})

		return subject
	}

	private async processImportAsync(eventId: number): Promise<void> {
		const evt = await this.events.findEventById(eventId)
		if (!evt.ggId) {
			throw new Error(`Event ${eventId} does not have a Golf Genius ID. Run Sync Event first.`)
		}

		const rounds = await this.events.findRoundsByEventId(eventId)
		if (rounds.length === 0) {
			throw new Error(`Event ${eventId} has no rounds. Run Sync Event first.`)
		}

		// Delete existing pairings for this event
		await this.pairings.deleteByEventId(eventId)

		const result: ImportResult = {
			eventId,
			actionName: "Import Teesheet",
			totalProcessed: 0,
			created: 0,
			updated: 0,
			skipped: 0,
			errors: [],
		}

		for (const round of rounds) {
			if (!round.ggId) {
				result.errors.push({
					itemName: `Round ${round.roundNumber}`,
					error: "Round does not have a Golf Genius ID",
				})
				continue
			}

			this.progressTracker.emitProgress(eventId, {
				totalPlayers: rounds.length,
				processedPlayers: result.totalProcessed,
				status: "processing",
				message: `Importing teesheet for round ${round.roundNumber} of ${rounds.length}...`,
			})

			const pairingGroups = await this.apiClient.getRoundTeeSheet(
				evt.ggId,
				round.ggId,
				true, // include custom fields for player_id
			)

			await this.processPairingGroups(eventId, round.id, pairingGroups, result)
			result.totalProcessed++
		}

		await this.progressTracker.completeOperation(eventId, result)
	}

	private async processPairingGroups(
		eventId: number,
		roundId: number,
		groups: GgPairingGroup[],
		result: ImportResult,
	): Promise<void> {
		for (const group of groups) {
			for (const player of group.players) {
				const playerId = player.custom_fields?.player_id
				if (!playerId) {
					result.errors.push({
						itemName: player.name,
						error: "Missing player_id in custom_fields",
					})
					result.skipped++
					continue
				}

				const error = await this.createPairing(eventId, roundId, group, player, playerId)
				if (error) {
					result.errors.push(error)
					result.skipped++
				} else {
					result.created++
				}
			}
		}
	}

	private async createPairing(
		eventId: number,
		roundId: number,
		group: GgPairingGroup,
		player: GgPairingGroup["players"][number],
		playerId: string,
	): Promise<ImportError | null> {
		try {
			const courseGgId = player.tee.course_id
			const teeGgId = player.tee.id
			const holeNumber = parseInt(group.hole, 10)

			const courseRow = await this.courses.findCourseByGgId(courseGgId)
			if (!courseRow) {
				return {
					itemName: player.name,
					error: `Course not found for gg_id ${courseGgId}`,
				}
			}

			const teeRow = await this.courses.findTeeByGgId(teeGgId)
			if (!teeRow) {
				return {
					itemName: player.name,
					error: `Tee not found for gg_id ${teeGgId}`,
				}
			}

			const holes = await this.courses.findHolesByCourseId(courseRow.id)
			const holeRow = holes.find((h) => h.holeNumber === holeNumber)
			if (!holeRow) {
				return {
					itemName: player.name,
					error: `Hole ${holeNumber} not found for course ${courseRow.name}`,
				}
			}

			await this.pairings.insert({
				eventId,
				roundId,
				playerId: parseInt(playerId, 10),
				courseId: courseRow.id,
				teeId: teeRow.id,
				holeId: holeRow.id,
				teeTime: group.tee_time,
				groupGgid: group.foursome_ggid,
				pairingGroupId: group.id,
			})

			return null
		} catch (error: unknown) {
			return {
				itemName: player.name,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}
}

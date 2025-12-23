import { Observable, Subject } from "rxjs"

import { Injectable, Logger } from "@nestjs/common"
import { PlayerProgressEvent } from "@repo/domain/types"

import { CoursesRepository } from "../../courses"
import { ScorecardRow, ScoreInsert } from "../../database"
import { EventsService } from "../../events"
import { RegistrationRepository } from "../../registration"
import { ScoresRepository } from "../../scores"
import { ApiClient } from "../api-client"
import { ImportResult } from "../dto"
import { GgTeeSheetPlayerDto } from "../dto/golf-genius.dto"
import { ProgressTracker } from "./progress-tracker"

interface ImportScoresResult {
	scorecards: {
		created: number
		updated: number
		skipped: number
	}
	errors: Array<{
		playerName: string
		reason: string
		details?: unknown
	}>
}

export interface ImportEventScoresResult {
	eventId: number
	roundsProcessed: number
	totalScorecards: {
		created: number
		updated: number
		skipped: number
	}
	roundResults: Array<{
		roundId: string
		roundNumber: number
		scorecards: { created: number; updated: number; skipped: number }
		errors: Array<{ playerName: string; reason: string; details?: unknown }>
	}>
	errors: Array<{
		playerName: string
		reason: string
		details?: unknown
	}>
}

@Injectable()
export class ScoresImportService {
	private readonly logger = new Logger(ScoresImportService.name)

	constructor(
		private readonly scoresService: ScoresRepository,
		private readonly apiClient: ApiClient,
		private readonly registration: RegistrationRepository,
		private readonly courses: CoursesRepository,
		private readonly events: EventsService,
		private readonly progressTracker: ProgressTracker,
	) {}

	async importScoresForRound(
		eventId: number,
		eventGgId: string,
		roundGgId: string,
		onPlayerProcessed?: (playerCount: number) => void,
	): Promise<ImportScoresResult> {
		const teeSheet = await this.apiClient.getRoundTeeSheet(eventGgId.toString(), roundGgId)
		const results: ImportScoresResult = {
			scorecards: { created: 0, updated: 0, skipped: 0 },
			errors: [],
		}

		for (const pairing of teeSheet) {
			for (const player of pairing.pairing_group.players) {
				try {
					const playerId = await this.identifyPlayer(player)
					if (!playerId) {
						results.errors.push({
							playerName: player.name,
							reason: "Player could not be identified",
						})
						results.scorecards.skipped++

						// Emit progress for skipped player
						if (onPlayerProcessed) {
							onPlayerProcessed(1)
						}
						continue
					}

					const { courseId, teeId } = await this.lookupCourseAndTee(player)
					const scorecard = await this.createOrUpdateScorecard(
						eventId,
						playerId,
						player,
						courseId,
						teeId,
						results,
					)
					await this.createOrUpdateScores(scorecard.id, player, courseId)

					// Emit progress for successfully processed player
					if (onPlayerProcessed) {
						onPlayerProcessed(1)
					}
				} catch (error) {
					results.errors.push({
						playerName: player.name,
						reason: error instanceof Error ? error.message : String(error),
						details: error,
					})

					// Emit progress for failed player
					if (onPlayerProcessed) {
						onPlayerProcessed(1)
					}
				}
			}
		}

		return results
	}

	private async identifyPlayer(playerData: GgTeeSheetPlayerDto): Promise<number | null> {
		if (playerData.external_id) {
			this.logger.debug(`Searching for player by slot id: ${playerData.external_id}`)
			const slot = await this.registration.findRegistrationSlotById(
				parseInt(playerData.external_id),
			)
			this.logger.verbose("Found registration slot " + JSON.stringify(slot))
			if (slot?.playerId) return slot.playerId
		}

		if (playerData.handicap_network_id) {
			this.logger.debug(`Searching for player by ghin: ${playerData.handicap_network_id}`)
			const player = await this.registration.findPlayerById(
				parseInt(playerData.handicap_network_id),
			)
			this.logger.verbose("Found player " + JSON.stringify(player))
			if (player) return player.id
		}

		if (playerData.player_roster_id) {
			this.logger.debug(
				`Searching for player by slot's golf genius id: ${playerData.player_roster_id}`,
			)
			const slot = await this.registration.findRegistrationSlotByGgId(playerData.player_roster_id)
			this.logger.verbose("Found registration slot " + JSON.stringify(slot))
			if (slot?.playerId) return slot.playerId
		}

		return null
	}

	private async lookupCourseAndTee(
		playerData: GgTeeSheetPlayerDto,
	): Promise<{ courseId: number; teeId: number }> {
		const teeGgId = playerData.tee.id
		const courseGgId = playerData.tee.course_id

		const course = await this.courses.findCourseByGgId(courseGgId)
		if (!course) throw new Error(`Course not found: ${courseGgId}`)

		const tee = await this.courses.findTeeByGgId(teeGgId)
		if (!tee) throw new Error(`Tee not found: ${teeGgId}`)

		return { courseId: course.id, teeId: tee.id }
	}

	private async createOrUpdateScorecard(
		eventId: number,
		playerId: number,
		playerData: GgTeeSheetPlayerDto,
		courseId: number,
		teeId: number,
		results: ImportScoresResult,
	) {
		const existing = await this.scoresService.findScorecard(eventId, playerId)
		const handicapIndex = this.parseHandicap(playerData.handicap_index)
		const courseHandicap = this.parseHandicap(playerData.course_handicap)

		if (existing) {
			results.scorecards.updated++
			return await this.scoresService.updateScorecard(existing.id, {
				eventId,
				playerId,
				handicapIndex: handicapIndex?.toString(),
				courseHandicap: courseHandicap ?? 0,
				courseId,
				teeId,
			} as ScorecardRow)
		} else {
			results.scorecards.created++
			return await this.scoresService.createScorecard({
				eventId,
				playerId,
				handicapIndex: handicapIndex?.toString(),
				courseHandicap: courseHandicap ?? 0,
				courseId,
				teeId,
			})
		}
	}

	private async createOrUpdateScores(
		scoreCardId: number,
		playerData: GgTeeSheetPlayerDto,
		courseId: number,
	): Promise<void> {
		// Delete all existing scores for this scorecard first
		await this.scoresService.deleteScoresByScorecard(scoreCardId)

		const holes = await this.courses.findHolesByCourseId(courseId)
		const allScores: ScoreInsert[] = []

		for (let i = 0; i < playerData.score_array.length; i++) {
			const grossScore = playerData.score_array[i]
			if (grossScore === null) continue

			const hole = holes.find((h) => h.holeNumber === i + 1)
			if (!hole) continue

			// Prepare gross score
			allScores.push({
				scorecardId: scoreCardId,
				holeId: hole.id,
				score: grossScore,
				isNet: 0,
			})

			// Calculate and prepare net score
			const handicapDots = playerData.handicap_dots_by_hole[i] || 0
			const netScore = grossScore - handicapDots

			allScores.push({
				scorecardId: scoreCardId,
				holeId: hole.id,
				score: netScore,
				isNet: 1,
			})
		}

		// Batch insert all scores (gross + net) in one query
		await this.scoresService.batchCreateScores(allScores)
	}

	private parseHandicap(value: string): number | undefined {
		if (!value) return undefined
		const trimmed = value.trim()
		if (trimmed.startsWith("+")) {
			return -parseFloat(trimmed.substring(1))
		}
		return parseFloat(trimmed)
	}

	async importScoresForEvent(eventId: number): Promise<ImportEventScoresResult> {
		const event = await this.events.getValidatedClubEventById(eventId)
		if (!event) {
			throw new Error("No event found with an id of " + eventId.toString())
		}

		const result: ImportEventScoresResult = {
			eventId,
			roundsProcessed: 0,
			totalScorecards: { created: 0, updated: 0, skipped: 0 },
			roundResults: [],
			errors: [],
		}

		for (const round of event.eventRounds) {
			try {
				const roundResult = await this.importScoresForRound(eventId, event.ggId, round.ggId)
				result.roundResults.push({
					roundId: round.id.toString(),
					roundNumber: round.roundNumber,
					scorecards: roundResult.scorecards,
					errors: roundResult.errors,
				})

				// Aggregate totals
				result.totalScorecards.created += roundResult.scorecards.created
				result.totalScorecards.updated += roundResult.scorecards.updated
				result.totalScorecards.skipped += roundResult.scorecards.skipped
				result.roundsProcessed++

				// Collect errors
				result.errors.push(...roundResult.errors)
			} catch (error) {
				result.errors.push({
					playerName: "System",
					reason: `Failed to import round ${round.id}: ${(error as Error).message}`,
					details: error,
				})
			}
		}

		return result
	}

	getProgressObservable(eventId: number): Subject<PlayerProgressEvent> | null {
		return this.progressTracker.getProgressObservable(
			eventId,
		) as Subject<PlayerProgressEvent> | null
	}

	async importScoresForEventStream(eventId: number): Promise<Observable<PlayerProgressEvent>> {
		const event = await this.events.getValidatedClubEventById(eventId)
		if (!event) {
			throw new Error("No event found with an id of " + eventId.toString())
		}

		// Calculate total players across all rounds for progress tracking
		let totalPlayers = 0
		for (const round of event.eventRounds) {
			try {
				const teeSheet = await this.apiClient.getRoundTeeSheet(event.ggId, round.ggId)
				for (const pairing of teeSheet) {
					totalPlayers += pairing.pairing_group.players.length
				}
			} catch {
				// Continue counting, we'll handle errors during actual processing
			}
		}

		// Start tracking progress
		const progressObservable = this.progressTracker.startTracking(eventId, totalPlayers)

		void (async () => {
			const result: ImportResult = {
				eventId,
				actionName: "Import Scores",
				totalProcessed: 0,
				created: 0,
				updated: 0,
				skipped: 0,
				errors: [],
			}

			let processedPlayers = 0

			try {
				for (const round of event.eventRounds) {
					this.progressTracker.emitProgress(eventId, {
						totalPlayers,
						processedPlayers,
						status: "processing",
						message: `Processing round ${round.roundNumber}...`,
					})

					const roundResult = await this.importScoresForRound(
						eventId,
						event.ggId,
						round.ggId,
						(count) => {
							processedPlayers += count
							this.progressTracker.emitProgress(eventId, {
								totalPlayers,
								processedPlayers,
								status: processedPlayers >= totalPlayers ? "complete" : "processing",
								message: `Processed ${processedPlayers} of ${totalPlayers} players`,
							})
						},
					)

					// Aggregate results
					result.created += roundResult.scorecards.created
					result.updated += roundResult.scorecards.updated
					result.skipped += roundResult.scorecards.skipped
					result.totalProcessed +=
						roundResult.scorecards.created +
						roundResult.scorecards.updated +
						roundResult.scorecards.skipped

					// Convert errors to ImportError format
					result.errors.push(
						...roundResult.errors.map((err) => ({
							itemId: err.playerName,
							itemName: err.playerName,
							error: err.reason,
						})),
					)
				}

				// Complete the operation
				await this.progressTracker.completeOperation(eventId, result)
			} catch (error) {
				await this.progressTracker.errorOperation(
					eventId,
					"Import Scores",
					(error as Error).message,
				)
			}
		})()

		return progressObservable as Observable<PlayerProgressEvent>
	}
}

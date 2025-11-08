import { Injectable } from "@nestjs/common"

import { CoursesService } from "../../courses/courses.service"
import { EventsService } from "../../events/events.service"
import { RegistrationService } from "../../registration/registration.service"
import { ScoreDto } from "../../scores/dto/score.dto"
import { ScoresService } from "../../scores/scores.service"
import { ApiClient } from "../api-client"
import { GgTeeSheetPlayerDto } from "../dto/golf-genius.dto"

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
	constructor(
		private readonly scoresService: ScoresService,
		private readonly apiClient: ApiClient,
		private readonly registrationService: RegistrationService,
		private readonly coursesService: CoursesService,
		private readonly eventsService: EventsService,
	) {}

	async importScoresForRound(
		eventId: number,
		eventGgId: string,
		roundGgId: string,
	): Promise<ImportScoresResult> {
		const teeSheet = await this.apiClient.getRoundTeeSheet(eventGgId.toString(), roundGgId)
		const results: ImportScoresResult = {
			scorecards: { created: 0, updated: 0, skipped: 0 },
			errors: [],
		}

		for (const pairing of teeSheet) {
			for (const player of pairing.pairing_group.players) {
				try {
					const playerId = await this.identifyPlayer(player, eventId)
					if (!playerId) {
						results.errors.push({
							playerName: player.name,
							reason: "Player could not be identified",
						})
						results.scorecards.skipped++
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
					await this.createOrUpdateScores(scorecard!.id!, player, courseId)
				} catch (error) {
					results.errors.push({
						playerName: player.name,
						reason: (error as any).message,
						details: error,
					})
				}
			}
		}

		return results
	}

	private async identifyPlayer(
		playerData: GgTeeSheetPlayerDto,
		eventId: number,
	): Promise<number | null> {
		if (playerData.handicap_network_id) {
			const player = await this.registrationService.findPlayerById(
				parseInt(playerData.handicap_network_id),
			)
			if (player) return player.id!
		}

		if (playerData.external_id) {
			const slot = await this.registrationService.findRegistrationSlotByEventAndExternalId(
				eventId,
				playerData.external_id,
			)
			if (slot?.playerId) return slot.playerId
		}

		if (playerData.player_roster_id) {
			const slot = await this.registrationService.findRegistrationSlotByGgId(
				playerData.player_roster_id,
			)
			if (slot?.playerId) return slot.playerId
		}

		return null
	}

	private async lookupCourseAndTee(
		playerData: GgTeeSheetPlayerDto,
	): Promise<{ courseId: number; teeId: number }> {
		const teeGgId = playerData.tee.id
		const courseGgId = playerData.tee.course_id

		const course = await this.coursesService.findCourseByGgId(courseGgId)
		if (!course) throw new Error(`Course not found: ${courseGgId}`)

		const tee = await this.coursesService.findTeeByGgId(teeGgId)
		if (!tee) throw new Error(`Tee not found: ${teeGgId}`)

		return { courseId: course.id!, teeId: tee.id! }
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
			return await this.scoresService.updateScorecard(existing.id!, {
				eventId,
				playerId,
				handicapIndex: handicapIndex?.toString() ?? null,
				courseHandicap: courseHandicap ?? 0,
				courseId,
				teeId,
			})
		} else {
			results.scorecards.created++
			return await this.scoresService.createScorecard({
				eventId,
				playerId,
				handicapIndex: handicapIndex?.toString() ?? null,
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

		const holes = await this.coursesService.findHolesByCourseId(courseId)
		const allScores: ScoreDto[] = []

		for (let i = 0; i < playerData.score_array.length; i++) {
			const grossScore = playerData.score_array[i]
			if (grossScore === null) continue

			const hole = holes.find((h) => h.holeNumber === i + 1)
			if (!hole) continue

			// Prepare gross score
			allScores.push({
				scoreCardId,
				holeId: hole.id!,
				score: grossScore,
				isNet: false,
			})

			// Calculate and prepare net score
			const handicapDots = playerData.handicap_dots_by_hole[i] || 0
			const netScore = grossScore - handicapDots

			allScores.push({
				scoreCardId,
				holeId: hole.id!,
				score: netScore,
				isNet: true,
			})
		}

		// Batch insert all scores (gross + net) in one query
		await this.scoresService.batchCreateScores(allScores)
	}

	private parseHandicap(value: string): number | null {
		if (!value) return null
		const trimmed = value.trim()
		if (trimmed.startsWith("+")) {
			return -parseFloat(trimmed.substring(1))
		}
		return parseFloat(trimmed)
	}

	async importScoresForEvent(eventId: number): Promise<ImportEventScoresResult> {
		const event = await this.eventsService.findEventById(eventId)
		const rounds = await this.eventsService.findRoundsByEventId(eventId)

		// Validation: event is not null and rounds.length > 0
		if (!event || !event.id) {
			throw new Error("No event found with an id of " + eventId.toString())
		}
		if (!rounds || rounds.length === 0) {
			throw new Error("No rounds found for an event with an id of " + eventId.toString())
		}

		const result: ImportEventScoresResult = {
			eventId,
			roundsProcessed: 0,
			totalScorecards: { created: 0, updated: 0, skipped: 0 },
			roundResults: [],
			errors: [],
		}

		for (const round of rounds) {
			try {
				const roundResult = await this.importScoresForRound(eventId, event.ggId!, round.ggId!)
				result.roundResults.push({
					roundId: round.id!.toString(),
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
					reason: `Failed to import round ${round.id}: ${(error as any).message}`,
					details: error,
				})
			}
		}

		return result
	}
}

import { Inject, Injectable } from "@nestjs/common"

import { CoreService } from "../../core"
import { EventsService } from "../../events/events.service"
import { ScoresService } from "../../scores/scores.service"

@Injectable()
export class LowScoresImportService {
	constructor(
		@Inject(CoreService) private readonly core: CoreService,
		@Inject(ScoresService) private readonly scores: ScoresService,
		@Inject(EventsService) private readonly events: EventsService,
	) {}

	async importLowScores(eventId: number): Promise<Record<string, number>> {
		const event = await this.events.getCompleteClubEventById(eventId)
		const season = event.season
		const counters: Record<string, number> = {}

		for (const course of event.courses ?? []) {
			let created = 0

			// Process Gross (isNet = false)
			const grossScorecards = await this.scores.findScorecardsByEventAndCourse(
				eventId,
				course.id,
				false,
			)
			const grossLowScores = await this.core.findLowScores(season, course.name, false)
			// Calculate total scores per scorecard
			const scorecardTotals = grossScorecards.map((sc) => ({
				playerId: sc.playerId,
				totalScore: sc.scores?.reduce((sum, s) => sum + s.score, 0) ?? 0,
			}))
			const grossMinScore = Math.min(...scorecardTotals.map((st) => st.totalScore))
			const grossCurrentLow = grossLowScores.length > 0 ? grossLowScores[0].score : Infinity

			if (grossMinScore < grossCurrentLow) {
				// New low: delete existing, insert all players with the new score
				await this.core.deleteLowScores(season, course.name, false)
				const playersWithLow = scorecardTotals.filter((st) => st.totalScore === grossMinScore)
				for (const st of playersWithLow) {
					await this.core.createLowScore({
						season,
						courseName: course.name,
						score: grossMinScore,
						playerId: st.playerId,
						isNet: 0,
					})
					created++
				}
			} else if (grossMinScore === grossCurrentLow) {
				// Tie: insert all players with the score (avoid duplicates)
				const playersWithTie = scorecardTotals.filter((st) => st.totalScore === grossMinScore)
				for (const st of playersWithTie) {
					const alreadyExists = await this.core.existsLowScore(
						season,
						course.name,
						false,
						st.playerId,
					)
					if (!alreadyExists) {
						await this.core.createLowScore({
							season,
							courseName: course.name,
							score: grossMinScore,
							playerId: st.playerId,
							isNet: 0,
						})
						created++
					}
				}
			}

			// Process Net (isNet = true)
			const netScorecards = await this.scores.findScorecardsByEventAndCourse(
				eventId,
				course.id,
				true,
			)
			const netLowScores = await this.core.findLowScores(season, course.name, true)
			const netScorecardTotals = netScorecards.map((sc) => ({
				playerId: sc.playerId,
				totalScore: sc.scores?.reduce((sum, s) => sum + s.score, 0) ?? 0,
			}))
			const netMinScore = Math.min(...netScorecardTotals.map((st) => st.totalScore))
			const netCurrentLow = netLowScores.length > 0 ? netLowScores[0].score : Infinity

			if (netMinScore < netCurrentLow) {
				await this.core.deleteLowScores(season, course.name, true)
				const playersWithLow = netScorecardTotals.filter((st) => st.totalScore === netMinScore)
				for (const st of playersWithLow) {
					await this.core.createLowScore({
						season,
						courseName: course.name,
						score: netMinScore,
						playerId: st.playerId,
						isNet: 1,
					})
					created++
				}
			} else if (netMinScore === netCurrentLow) {
				const playersWithTie = netScorecardTotals.filter((st) => st.totalScore === netMinScore)
				for (const st of playersWithTie) {
					const alreadyExists = await this.core.existsLowScore(
						season,
						course.name,
						true,
						st.playerId,
					)
					if (!alreadyExists) {
						await this.core.createLowScore({
							season,
							courseName: course.name,
							score: netMinScore,
							playerId: st.playerId,
							isNet: 1,
						})
						created++
					}
				}
			}

			counters[course.name] = (counters[course.name] || 0) + created
		}

		return counters
	}
}

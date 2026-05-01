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
			const numberOfHoles = course.numberOfHoles

			// Process Gross (isNet = false)
			const grossScorecards = await this.scores.findScorecardsByEventAndCourse(
				eventId,
				course.id,
				false,
			)
			// A round is complete only if the player has a gross score for every
			// hole and every gross score is > 0. Partial rounds (DNF) are excluded
			// from low-score consideration. Gross is the source of truth here —
			// net = gross - dots, so a hole with no gross was not played.
			const completePlayerIds = new Set(
				grossScorecards
					.filter(
						(sc) => sc.scores?.length === numberOfHoles && sc.scores.every((s) => s.score > 0),
					)
					.map((sc) => sc.playerId),
			)

			const grossLowScores = await this.core.findLowScores(season, course.name, false)
			const scorecardTotals = grossScorecards
				.filter((sc) => completePlayerIds.has(sc.playerId))
				.map((sc) => ({
					playerId: sc.playerId,
					totalScore: sc.scores.reduce((sum, s) => sum + s.score, 0),
				}))

			if (scorecardTotals.length > 0) {
				const grossMinScore = Math.min(...scorecardTotals.map((st) => st.totalScore))
				// Treat invalid existing low scores (<=0) as nonexistent
				const validGrossLow = grossLowScores.find((ls) => ls.score > 0)
				const grossCurrentLow = validGrossLow ? validGrossLow.score : Infinity

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
			}

			// Process Net (isNet = true)
			const netScorecards = await this.scores.findScorecardsByEventAndCourse(
				eventId,
				course.id,
				true,
			)
			const netLowScores = await this.core.findLowScores(season, course.name, true)
			const netScorecardTotals = netScorecards
				.filter((sc) => completePlayerIds.has(sc.playerId))
				.map((sc) => ({
					playerId: sc.playerId,
					totalScore: sc.scores.reduce((sum, s) => sum + s.score, 0),
				}))

			if (netScorecardTotals.length > 0) {
				const netMinScore = Math.min(...netScorecardTotals.map((st) => st.totalScore))
				// Treat invalid existing low scores (<=0) as nonexistent
				const validNetLow = netLowScores.find((ls) => ls.score > 0)
				const netCurrentLow = validNetLow ? validNetLow.score : Infinity

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
			}

			counters[course.name] = (counters[course.name] || 0) + created
		}

		return counters
	}
}

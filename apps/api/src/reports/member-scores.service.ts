import { and, eq, inArray } from "drizzle-orm"

import { Inject, Injectable } from "@nestjs/common"

import { course, DrizzleService, event, eventScore, eventScorecard, hole, tee } from "../database"
import {
	addDataRows,
	addFixedColumns,
	createWorkbook,
	generateBuffer,
	styleHeaderRow,
} from "./excel.utils"

export type ScoreType = "gross" | "net" | "both"

interface ScoreRow {
	date: string
	tee: string
	type: string
	course: string
	hole1?: number
	hole2?: number
	hole3?: number
	hole4?: number
	hole5?: number
	hole6?: number
	hole7?: number
	hole8?: number
	hole9?: number
	total: number
}

@Injectable()
export class MemberScoresService {
	constructor(@Inject(DrizzleService) private readonly drizzle: DrizzleService) {}

	async getPlayerScoresExcel(
		playerId: number,
		season: number,
		courseIds?: number[],
		scoreType: ScoreType = "both",
	): Promise<Buffer> {
		// Query all scores for this player in the season
		const whereConditions = [eq(eventScorecard.playerId, playerId)]
		if (season > 0) {
			whereConditions.push(eq(event.season, season))
		}
		if (courseIds && courseIds.length > 0) {
			whereConditions.push(inArray(eventScorecard.courseId, courseIds))
		}

		const results = await this.drizzle.db
			.select({
				scorecardId: eventScorecard.id,
				eventDate: event.startDate,
				courseName: course.name,
				courseId: course.id,
				teeName: tee.name,
				score: eventScore.score,
				isNet: eventScore.isNet,
				holeNumber: hole.holeNumber,
			})
			.from(eventScorecard)
			.innerJoin(event, eq(eventScorecard.eventId, event.id))
			.innerJoin(course, eq(eventScorecard.courseId, course.id))
			.leftJoin(tee, eq(eventScorecard.teeId, tee.id))
			.innerJoin(eventScore, eq(eventScore.scorecardId, eventScorecard.id))
			.innerJoin(hole, eq(eventScore.holeId, hole.id))
			.where(and(...whereConditions))
			.orderBy(course.name, event.startDate)

		// Group scores by scorecard and net/gross type
		const scorecardMap = new Map<
			string,
			{
				date: string
				tee: string
				course: string
				isNet: boolean
				scores: Map<number, number>
			}
		>()

		for (const row of results) {
			const key = `${row.scorecardId}-${row.isNet}`
			if (!scorecardMap.has(key)) {
				scorecardMap.set(key, {
					date: row.eventDate,
					tee: row.teeName || "",
					course: row.courseName,
					isNet: row.isNet === 1,
					scores: new Map(),
				})
			}
			scorecardMap.get(key)!.scores.set(row.holeNumber, row.score)
		}

		// Convert to rows
		const allRows: Array<{ row: ScoreRow; isNet: boolean; course: string; date: string }> = []
		for (const scorecard of scorecardMap.values()) {
			const total = Array.from(scorecard.scores.values()).reduce((sum, s) => sum + s, 0)
			const row: ScoreRow = {
				date: scorecard.date,
				tee: scorecard.tee,
				type: scorecard.isNet ? "Net" : "Gross",
				course: scorecard.course,
				hole1: scorecard.scores.get(1),
				hole2: scorecard.scores.get(2),
				hole3: scorecard.scores.get(3),
				hole4: scorecard.scores.get(4),
				hole5: scorecard.scores.get(5),
				hole6: scorecard.scores.get(6),
				hole7: scorecard.scores.get(7),
				hole8: scorecard.scores.get(8),
				hole9: scorecard.scores.get(9),
				total,
			}
			allRows.push({ row, isNet: scorecard.isNet, course: scorecard.course, date: scorecard.date })
		}

		// Sort by course name, then event date
		allRows.sort((a, b) => {
			const courseCompare = a.course.localeCompare(b.course)
			if (courseCompare !== 0) return courseCompare
			return a.date.localeCompare(b.date)
		})

		// Create workbook
		const workbook = createWorkbook()

		const columns = [
			{ header: "Date", key: "date", width: 12 },
			{ header: "Tee", key: "tee", width: 10 },
			{ header: "Type", key: "type", width: 8 },
			{ header: "Course", key: "course", width: 20 },
			{ header: "1", key: "hole1", width: 5 },
			{ header: "2", key: "hole2", width: 5 },
			{ header: "3", key: "hole3", width: 5 },
			{ header: "4", key: "hole4", width: 5 },
			{ header: "5", key: "hole5", width: 5 },
			{ header: "6", key: "hole6", width: 5 },
			{ header: "7", key: "hole7", width: 5 },
			{ header: "8", key: "hole8", width: 5 },
			{ header: "9", key: "hole9", width: 5 },
			{ header: "Total", key: "total", width: 8 },
		]

		if (scoreType === "both") {
			// Create two worksheets
			const grossRows = allRows.filter((r) => !r.isNet).map((r) => r.row)
			const netRows = allRows.filter((r) => r.isNet).map((r) => r.row)

			const grossSheet = workbook.addWorksheet("Gross Scores")
			addFixedColumns(grossSheet, columns)
			styleHeaderRow(grossSheet, 1)
			addDataRows(grossSheet, 2, grossRows as unknown as Record<string, unknown>[], columns)

			const netSheet = workbook.addWorksheet("Net Scores")
			addFixedColumns(netSheet, columns)
			styleHeaderRow(netSheet, 1)
			addDataRows(netSheet, 2, netRows as unknown as Record<string, unknown>[], columns)
		} else {
			// Single worksheet
			const filteredRows = allRows
				.filter((r) => (scoreType === "net" ? r.isNet : !r.isNet))
				.map((r) => r.row)
			const sheetName = scoreType === "net" ? "Net Scores" : "Gross Scores"
			const worksheet = workbook.addWorksheet(sheetName)
			addFixedColumns(worksheet, columns)
			styleHeaderRow(worksheet, 1)
			addDataRows(worksheet, 2, filteredRows as unknown as Record<string, unknown>[], columns)
		}

		return generateBuffer(workbook)
	}
}

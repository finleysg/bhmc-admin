import * as ExcelJS from "exceljs"

import { MemberScoresService } from "../member-scores.service"

// =============================================================================
// Test Fixtures
// =============================================================================

const createScoreResult = (overrides: Partial<ScoreQueryResult> = {}): ScoreQueryResult => ({
	scorecardId: 1,
	eventDate: "2024-06-15",
	courseName: "Bunker Hills East",
	courseId: 1,
	teeName: "White",
	score: 4,
	isNet: 0,
	holeNumber: 1,
	...overrides,
})

interface ScoreQueryResult {
	scorecardId: number
	eventDate: string
	courseName: string
	courseId: number
	teeName: string | null
	score: number
	isNet: number
	holeNumber: number
}

function createNineHoleScores(
	scorecardId: number,
	isNet: number,
	scores: number[],
	overrides: Partial<ScoreQueryResult> = {},
): ScoreQueryResult[] {
	return scores.map((score, idx) =>
		createScoreResult({
			scorecardId,
			isNet,
			score,
			holeNumber: idx + 1,
			...overrides,
		}),
	)
}

// =============================================================================
// Mock Setup
// =============================================================================

const createMockDrizzleService = (results: ScoreQueryResult[] = []) => {
	const mockQueryBuilder = {
		select: jest.fn().mockReturnThis(),
		from: jest.fn().mockReturnThis(),
		innerJoin: jest.fn().mockReturnThis(),
		leftJoin: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		orderBy: jest.fn().mockResolvedValue(results),
	}
	return {
		db: mockQueryBuilder,
	}
}

function createService(results: ScoreQueryResult[] = []) {
	const drizzle = createMockDrizzleService(results)
	const service = new MemberScoresService(drizzle as any)
	return { service, drizzle }
}

async function loadWorkbook(buffer: any): Promise<ExcelJS.Workbook> {
	const workbook = new ExcelJS.Workbook()
	await workbook.xlsx.load(buffer)
	return workbook
}

// =============================================================================
// Tests
// =============================================================================

describe("MemberScoresService.getPlayerScoresExcel", () => {
	describe("query filtering", () => {
		test("queries with playerId and season", async () => {
			const { service, drizzle } = createService([])

			await service.getPlayerScoresExcel(42, 2024)

			expect(drizzle.db.select).toHaveBeenCalled()
			expect(drizzle.db.where).toHaveBeenCalled()
		})

		test("includes courseIds filter when provided", async () => {
			const { service, drizzle } = createService([])

			await service.getPlayerScoresExcel(42, 2024, [1, 2, 3])

			expect(drizzle.db.where).toHaveBeenCalled()
		})

		test("sorts by course name then event date", async () => {
			const { service, drizzle } = createService([])

			await service.getPlayerScoresExcel(42, 2024)

			expect(drizzle.db.orderBy).toHaveBeenCalled()
		})
	})

	describe("scoreType=both", () => {
		test("creates two worksheets: Gross Scores and Net Scores", async () => {
			const grossScores = createNineHoleScores(1, 0, [4, 5, 3, 4, 5, 4, 3, 4, 5])
			const netScores = createNineHoleScores(1, 1, [3, 4, 2, 3, 4, 3, 2, 3, 4])
			const { service } = createService([...grossScores, ...netScores])

			const buffer = await service.getPlayerScoresExcel(42, 2024, undefined, "both")

			const workbook = await loadWorkbook(buffer)

			expect(workbook.worksheets.length).toBe(2)
			expect(workbook.worksheets[0].name).toBe("Gross Scores")
			expect(workbook.worksheets[1].name).toBe("Net Scores")
		})

		test("gross worksheet contains only gross scores", async () => {
			const grossScores = createNineHoleScores(1, 0, [4, 5, 3, 4, 5, 4, 3, 4, 5])
			const netScores = createNineHoleScores(1, 1, [3, 4, 2, 3, 4, 3, 2, 3, 4])
			const { service } = createService([...grossScores, ...netScores])

			const buffer = await service.getPlayerScoresExcel(42, 2024, undefined, "both")

			const workbook = await loadWorkbook(buffer)

			const grossSheet = workbook.getWorksheet("Gross Scores")!
			// Row 1 is header, row 2+ is data
			expect(grossSheet.rowCount).toBe(2) // header + 1 data row
			const dataRow = grossSheet.getRow(2)
			expect(dataRow.getCell(3).value).toBe("Gross") // Type column
		})

		test("net worksheet contains only net scores", async () => {
			const grossScores = createNineHoleScores(1, 0, [4, 5, 3, 4, 5, 4, 3, 4, 5])
			const netScores = createNineHoleScores(1, 1, [3, 4, 2, 3, 4, 3, 2, 3, 4])
			const { service } = createService([...grossScores, ...netScores])

			const buffer = await service.getPlayerScoresExcel(42, 2024, undefined, "both")

			const workbook = await loadWorkbook(buffer)

			const netSheet = workbook.getWorksheet("Net Scores")!
			expect(netSheet.rowCount).toBe(2) // header + 1 data row
			const dataRow = netSheet.getRow(2)
			expect(dataRow.getCell(3).value).toBe("Net") // Type column
		})
	})

	describe("scoreType=gross", () => {
		test("creates single worksheet named Gross Scores", async () => {
			const grossScores = createNineHoleScores(1, 0, [4, 5, 3, 4, 5, 4, 3, 4, 5])
			const netScores = createNineHoleScores(1, 1, [3, 4, 2, 3, 4, 3, 2, 3, 4])
			const { service } = createService([...grossScores, ...netScores])

			const buffer = await service.getPlayerScoresExcel(42, 2024, undefined, "gross")

			const workbook = await loadWorkbook(buffer)

			expect(workbook.worksheets.length).toBe(1)
			expect(workbook.worksheets[0].name).toBe("Gross Scores")
		})

		test("excludes net scores from output", async () => {
			const grossScores = createNineHoleScores(1, 0, [4, 5, 3, 4, 5, 4, 3, 4, 5])
			const netScores = createNineHoleScores(1, 1, [3, 4, 2, 3, 4, 3, 2, 3, 4])
			const { service } = createService([...grossScores, ...netScores])

			const buffer = await service.getPlayerScoresExcel(42, 2024, undefined, "gross")

			const workbook = await loadWorkbook(buffer)

			const sheet = workbook.worksheets[0]
			// Only header + 1 gross row (no net rows)
			expect(sheet.rowCount).toBe(2)
		})
	})

	describe("scoreType=net", () => {
		test("creates single worksheet named Net Scores", async () => {
			const grossScores = createNineHoleScores(1, 0, [4, 5, 3, 4, 5, 4, 3, 4, 5])
			const netScores = createNineHoleScores(1, 1, [3, 4, 2, 3, 4, 3, 2, 3, 4])
			const { service } = createService([...grossScores, ...netScores])

			const buffer = await service.getPlayerScoresExcel(42, 2024, undefined, "net")

			const workbook = await loadWorkbook(buffer)

			expect(workbook.worksheets.length).toBe(1)
			expect(workbook.worksheets[0].name).toBe("Net Scores")
		})

		test("excludes gross scores from output", async () => {
			const grossScores = createNineHoleScores(1, 0, [4, 5, 3, 4, 5, 4, 3, 4, 5])
			const netScores = createNineHoleScores(1, 1, [3, 4, 2, 3, 4, 3, 2, 3, 4])
			const { service } = createService([...grossScores, ...netScores])

			const buffer = await service.getPlayerScoresExcel(42, 2024, undefined, "net")

			const workbook = await loadWorkbook(buffer)

			const sheet = workbook.worksheets[0]
			// Only header + 1 net row (no gross rows)
			expect(sheet.rowCount).toBe(2)
		})
	})

	describe("column structure", () => {
		test("worksheet has correct columns: Date, Tee, Type, Course, 1-9, Total", async () => {
			const scores = createNineHoleScores(1, 0, [4, 5, 3, 4, 5, 4, 3, 4, 5])
			const { service } = createService(scores)

			const buffer = await service.getPlayerScoresExcel(42, 2024, undefined, "gross")

			const workbook = await loadWorkbook(buffer)

			const sheet = workbook.worksheets[0]
			const headerRow = sheet.getRow(1)

			expect(headerRow.getCell(1).value).toBe("Date")
			expect(headerRow.getCell(2).value).toBe("Tee")
			expect(headerRow.getCell(3).value).toBe("Type")
			expect(headerRow.getCell(4).value).toBe("Course")
			expect(headerRow.getCell(5).value).toBe("1")
			expect(headerRow.getCell(6).value).toBe("2")
			expect(headerRow.getCell(7).value).toBe("3")
			expect(headerRow.getCell(8).value).toBe("4")
			expect(headerRow.getCell(9).value).toBe("5")
			expect(headerRow.getCell(10).value).toBe("6")
			expect(headerRow.getCell(11).value).toBe("7")
			expect(headerRow.getCell(12).value).toBe("8")
			expect(headerRow.getCell(13).value).toBe("9")
			expect(headerRow.getCell(14).value).toBe("Total")
		})

		test("data rows contain correct values", async () => {
			const scores = createNineHoleScores(1, 0, [4, 5, 3, 4, 5, 4, 3, 4, 5], {
				eventDate: "2024-06-15",
				teeName: "Blue",
				courseName: "East Course",
			})
			const { service } = createService(scores)

			const buffer = await service.getPlayerScoresExcel(42, 2024, undefined, "gross")

			const workbook = await loadWorkbook(buffer)

			const sheet = workbook.worksheets[0]
			const dataRow = sheet.getRow(2)

			expect(dataRow.getCell(1).value).toBe("2024-06-15") // Date
			expect(dataRow.getCell(2).value).toBe("Blue") // Tee
			expect(dataRow.getCell(3).value).toBe("Gross") // Type
			expect(dataRow.getCell(4).value).toBe("East Course") // Course
			expect(dataRow.getCell(5).value).toBe(4) // Hole 1
			expect(dataRow.getCell(14).value).toBe(37) // Total (4+5+3+4+5+4+3+4+5)
		})
	})

	describe("sorting", () => {
		test("rows sorted by course name then event date", async () => {
			// Create scores for multiple courses and dates
			const scoresA = createNineHoleScores(1, 0, [4, 4, 4, 4, 4, 4, 4, 4, 4], {
				courseName: "West Course",
				eventDate: "2024-06-20",
			})
			const scoresB = createNineHoleScores(2, 0, [3, 3, 3, 3, 3, 3, 3, 3, 3], {
				courseName: "East Course",
				eventDate: "2024-06-15",
			})
			const scoresC = createNineHoleScores(3, 0, [5, 5, 5, 5, 5, 5, 5, 5, 5], {
				courseName: "East Course",
				eventDate: "2024-06-10",
			})
			const { service } = createService([...scoresA, ...scoresB, ...scoresC])

			const buffer = await service.getPlayerScoresExcel(42, 2024, undefined, "gross")

			const workbook = await loadWorkbook(buffer)

			const sheet = workbook.worksheets[0]
			// Sorted: East(06-10), East(06-15), West(06-20)
			expect(sheet.getRow(2).getCell(4).value).toBe("East Course")
			expect(sheet.getRow(2).getCell(1).value).toBe("2024-06-10")
			expect(sheet.getRow(3).getCell(4).value).toBe("East Course")
			expect(sheet.getRow(3).getCell(1).value).toBe("2024-06-15")
			expect(sheet.getRow(4).getCell(4).value).toBe("West Course")
			expect(sheet.getRow(4).getCell(1).value).toBe("2024-06-20")
		})
	})

	describe("edge cases", () => {
		test("handles empty results", async () => {
			const { service } = createService([])

			const buffer = await service.getPlayerScoresExcel(42, 2024)

			const workbook = await loadWorkbook(buffer)

			// Should still create worksheets (with headers only)
			expect(workbook.worksheets.length).toBe(2)
			expect(workbook.worksheets[0].rowCount).toBe(1) // header only
		})

		test("handles null tee name", async () => {
			const scores = createNineHoleScores(1, 0, [4, 4, 4, 4, 4, 4, 4, 4, 4], {
				teeName: null,
			})
			const { service } = createService(scores)

			const buffer = await service.getPlayerScoresExcel(42, 2024, undefined, "gross")

			const workbook = await loadWorkbook(buffer)

			const sheet = workbook.worksheets[0]
			expect(sheet.getRow(2).getCell(2).value).toBe("") // Empty string for null tee
		})

		test("calculates total correctly", async () => {
			const scores = createNineHoleScores(1, 0, [1, 2, 3, 4, 5, 6, 7, 8, 9])
			const { service } = createService(scores)

			const buffer = await service.getPlayerScoresExcel(42, 2024, undefined, "gross")

			const workbook = await loadWorkbook(buffer)

			const sheet = workbook.worksheets[0]
			expect(sheet.getRow(2).getCell(14).value).toBe(45) // 1+2+3+4+5+6+7+8+9
		})
	})
})

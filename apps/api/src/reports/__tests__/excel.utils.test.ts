import { EventReportRow } from "@repo/domain/types"

import { addDataRows, addFixedColumns, deriveDynamicColumns, styleHeaderRow } from "../excel.utils"

describe("styleHeaderRow", () => {
	it("styles the specified row with bold font and lavender fill", () => {
		const mockWorksheet = {
			getRow: jest.fn().mockReturnValue({
				font: {},
				fill: {},
			}),
		} as any

		styleHeaderRow(mockWorksheet, 1)

		expect(mockWorksheet.getRow).toHaveBeenCalledWith(1)
		const row = mockWorksheet.getRow.mock.results[0].value
		expect(row.font).toEqual({ bold: true })
		expect(row.fill).toEqual({
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FFE6E6FA" },
		})
	})
})

describe("addFixedColumns", () => {
	it("sets worksheet columns to the provided array", () => {
		const mockWorksheet = { columns: [] } as any
		const columns = [
			{ header: "Name", key: "name", width: 20 },
			{ header: "Score", key: "score", width: 10 },
		]

		addFixedColumns(mockWorksheet, columns)

		expect(mockWorksheet.columns).toEqual(columns)
	})
})

describe("addDataRows", () => {
	it("adds rows to worksheet and returns the next row number", () => {
		const mockWorksheet = {
			addRow: jest.fn(),
		} as any
		const rows = [
			{ name: "John", score: 85 },
			{ name: "Jane", score: 90 },
		]
		const columns = [
			{ header: "Name", key: "name", width: 20 },
			{ header: "Score", key: "score", width: 10 },
		]

		const nextRow = addDataRows(mockWorksheet, 2, rows, columns)

		expect(mockWorksheet.addRow).toHaveBeenCalledTimes(2)
		expect(mockWorksheet.addRow).toHaveBeenNthCalledWith(1, ["John", 85])
		expect(mockWorksheet.addRow).toHaveBeenNthCalledWith(2, ["Jane", 90])
		expect(nextRow).toBe(4)
	})

	it("handles missing keys with empty string", () => {
		const mockWorksheet = {
			addRow: jest.fn(),
		} as any
		const rows = [{ name: "John" }] // missing score
		const columns = [
			{ header: "Name", key: "name", width: 20 },
			{ header: "Score", key: "score", width: 10 },
		]

		addDataRows(mockWorksheet, 1, rows, columns)

		expect(mockWorksheet.addRow).toHaveBeenCalledWith(["John", ""])
	})

	it("returns correct row number for empty rows", () => {
		const mockWorksheet = {
			addRow: jest.fn(),
		} as any

		const nextRow = addDataRows(mockWorksheet, 5, [], [])

		expect(mockWorksheet.addRow).not.toHaveBeenCalled()
		expect(nextRow).toBe(5)
	})
})

describe("deriveDynamicColumns", () => {
	it("derives columns from dynamic keys excluding fixed keys", () => {
		const rows = [
			{
				playerName: "John",
				totalScore: 85,
				hole1: 4,
				hole2: 5,
			} as unknown as EventReportRow,
		]
		const fixedKeys = ["playerName", "totalScore"]

		const columns = deriveDynamicColumns(rows, fixedKeys)

		expect(columns).toEqual([
			{ header: "Hole1", key: "hole1", width: 12 },
			{ header: "Hole2", key: "hole2", width: 12 },
		])
	})

	it("returns empty array for empty rows", () => {
		const columns = deriveDynamicColumns([], ["fixed"])

		expect(columns).toEqual([])
	})

	it("handles camelCase to space-separated headers", () => {
		const rows = [{ totalGrossScore: 100 } as unknown as EventReportRow]

		const columns = deriveDynamicColumns(rows, [])

		expect(columns[0].header).toBe("Total Gross Score")
	})
})

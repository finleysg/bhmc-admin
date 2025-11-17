import { Workbook, Worksheet } from "exceljs"

import { EventReportRowDto } from "@repo/domain/types"

export async function createWorkbook(): Promise<Workbook> {
	const ExcelJS = await import("exceljs")
	return new ExcelJS.Workbook()
}

export function styleHeaderRow(worksheet: Worksheet, rowNum: number): void {
	const headerRow = worksheet.getRow(rowNum)
	headerRow.font = { bold: true }
	headerRow.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFE6E6FA" },
	}
}

export function addFixedColumns(
	worksheet: Worksheet,
	columns: Array<{ header: string; key: string; width: number }>,
): void {
	worksheet.columns = columns
}

export function addDataRows<T extends Record<string, unknown>>(
	worksheet: Worksheet,
	startRow: number,
	rows: T[],
	columns: Array<{ header: string; key: string; width: number }>,
): number {
	let currentRow = startRow
	for (const row of rows) {
		const rowData: unknown[] = columns.map((col) => row[col.key] ?? "")
		worksheet.addRow(rowData)
		currentRow++
	}
	return currentRow
}

export function deriveDynamicColumns(
	rows: EventReportRowDto[],
	fixedKeys: string[],
): Array<{ header: string; key: string; width: number }> {
	if (rows.length === 0) return []
	const firstRow = rows[0]
	const dynamicKeys = Object.keys(firstRow).filter((key) => !fixedKeys.includes(key))
	return dynamicKeys.map((key) => ({
		header: key
			.replace(/([A-Z])/g, " $1")
			.replace(/^./, (str) => str.toUpperCase())
			.trim(),
		key,
		width: 12,
	}))
}

export async function generateBuffer(workbook: Workbook): Promise<Buffer> {
	const buffer = await workbook.xlsx.writeBuffer()
	return Buffer.from(buffer as ArrayBuffer)
}

import * as ExcelJS from "exceljs"

import type { CoursesService } from "../../courses"
import type { DrizzleService } from "../../database"
import type { EventsService } from "../../events"
import type { PlayerService } from "../../registration"
import { ReportsService } from "../reports.service"

// =============================================================================
// Drizzle mock
//
// The finance report issues several sequential queries with different chain
// terminators (.groupBy(), .where()). We mock the builder as a thenable: any
// chain method returns the builder, and awaiting it shifts the next queued
// result off the queue. Tests push results in the order the service issues
// queries.
// =============================================================================

type QueryResult = unknown[] | { total: number | string }[]

function createDrizzleMock(queue: QueryResult[]) {
	const builder: Record<string, unknown> = {}
	const chainable = [
		"select",
		"from",
		"innerJoin",
		"leftJoin",
		"where",
		"groupBy",
		"orderBy",
		"limit",
	]
	for (const method of chainable) {
		builder[method] = jest.fn(() => builder)
	}
	builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
		const next = queue.shift()
		return Promise.resolve(next).then(resolve, reject)
	}
	return { db: builder } as unknown as DrizzleService
}

const createEventsService = (exists = true) =>
	({
		exists: jest.fn().mockResolvedValue(exists),
	}) as unknown as EventsService

const createCoursesService = () => ({}) as unknown as CoursesService
const createPlayerService = () => ({}) as unknown as PlayerService

function createService(queue: QueryResult[]) {
	const drizzle = createDrizzleMock(queue)
	const events = createEventsService()
	const service = new ReportsService(createCoursesService(), events, createPlayerService(), drizzle)
	return { service, events }
}

// =============================================================================
// Result builders — keep tests readable by naming the query each queue entry
// satisfies.
// =============================================================================

interface FinanceQueueParts {
	grossByFeeType?: { feeTypeName: string; total: string }[]
	refunds?: { paymentId: number; refundAmount: string }[]
	refundFees?: { feeTypeName: string; amount: string }[][]
	outflows?: { payoutType: string; total: string }[]
	stripeFees?: { total: string }[]
}

function buildQueue(parts: FinanceQueueParts): QueryResult[] {
	const queue: QueryResult[] = []
	queue.push(parts.grossByFeeType ?? [])
	queue.push(parts.refunds ?? [])
	for (const feesForRefund of parts.refundFees ?? []) {
		queue.push(feesForRefund)
	}
	queue.push(parts.outflows ?? [])
	queue.push(parts.stripeFees ?? [{ total: "0" }])
	return queue
}

// =============================================================================
// Tests
// =============================================================================

describe("ReportsService.getFinanceReport", () => {
	test("empty event returns all zeros", async () => {
		const { service } = createService(buildQueue({}))

		const report = await service.getFinanceReport(1)

		expect(report).toEqual({
			eventId: 1,
			feeTypeSums: [],
			totalCollectedOnline: 0,
			collectedCash: 0,
			totalCollected: 0,
			proShopPayouts: 0,
			cashPayouts: 0,
			totalPayouts: 0,
			stripeFees: 0,
			greenFees: 0,
			cartFees: 0,
			totalPassThrough: 0,
			balance: 0,
		})
	})

	test("throws when event does not exist", async () => {
		const drizzle = createDrizzleMock([])
		const events = createEventsService(false)
		const service = new ReportsService(
			createCoursesService(),
			events,
			createPlayerService(),
			drizzle,
		)

		await expect(service.getFinanceReport(999)).rejects.toThrow("Event with id 999 does not exist.")
	})

	test("sums base fees by fee type", async () => {
		const { service } = createService(
			buildQueue({
				grossByFeeType: [
					{ feeTypeName: "Event Fee", total: "1475.00" },
					{ feeTypeName: "Greens Fee", total: "1866.00" },
					{ feeTypeName: "Cart Fee", total: "294.00" },
				],
				stripeFees: [{ total: "202.73" }],
			}),
		)

		const report = await service.getFinanceReport(1)

		expect(report.feeTypeSums).toEqual([
			{ feeTypeName: "Event Fee", amount: 1475 },
			{ feeTypeName: "Greens Fee", amount: 1866 },
			{ feeTypeName: "Cart Fee", amount: 294 },
		])
	})

	test("includes Stripe fees in gross total collected online", async () => {
		const { service } = createService(
			buildQueue({
				grossByFeeType: [
					{ feeTypeName: "Event Fee", total: "1475.00" },
					{ feeTypeName: "Greens Fee", total: "1866.00" },
					{ feeTypeName: "Cart Fee", total: "294.00" },
				],
				stripeFees: [{ total: "202.73" }],
			}),
		)

		const report = await service.getFinanceReport(1)

		// Gross = base fees + Stripe markup that players paid on top
		expect(report.stripeFees).toBeCloseTo(202.73, 2)
		expect(report.totalCollectedOnline).toBeCloseTo(3635 + 202.73, 2)
		expect(report.totalCollected).toBeCloseTo(3635 + 202.73, 2)
	})

	test("balance is net of Stripe fees (no double-counting)", async () => {
		// Players paid $5,232.73 gross. Stripe took $202.73. BHMC owes
		// course $2,160 (greens + cart). Pro shop + cash payouts = $1,000.
		// Expected balance: $5,030 - $2,160 - $1,000 = $1,870.
		const { service } = createService(
			buildQueue({
				grossByFeeType: [
					{ feeTypeName: "Event Fee", total: "1475.00" },
					{ feeTypeName: "Gross Skins", total: "600.00" },
					{ feeTypeName: "Net Skins", total: "795.00" },
					{ feeTypeName: "Greens Fee", total: "1866.00" },
					{ feeTypeName: "Cart Fee", total: "294.00" },
				],
				outflows: [
					{ payoutType: "Credit", total: "700.00" },
					{ payoutType: "Cash", total: "300.00" },
				],
				stripeFees: [{ total: "202.73" }],
			}),
		)

		const report = await service.getFinanceReport(1)

		expect(report.totalCollected).toBeCloseTo(5232.73, 2)
		expect(report.totalPayouts).toBeCloseTo(1000, 2)
		expect(report.stripeFees).toBeCloseTo(202.73, 2)
		expect(report.totalPassThrough).toBeCloseTo(2160, 2)
		expect(report.balance).toBeCloseTo(1870, 2)
	})

	test("pass-through uses only base Greens Fee + Cart Fee", async () => {
		const { service } = createService(
			buildQueue({
				grossByFeeType: [
					{ feeTypeName: "Event Fee", total: "500.00" },
					{ feeTypeName: "Greens Fee", total: "1866.00" },
					{ feeTypeName: "Cart Fee", total: "294.00" },
					{ feeTypeName: "Gross Skins", total: "100.00" },
				],
				stripeFees: [{ total: "50.00" }],
			}),
		)

		const report = await service.getFinanceReport(1)

		expect(report.greenFees).toBe(1866)
		expect(report.cartFees).toBe(294)
		expect(report.totalPassThrough).toBe(2160)
	})

	test("pass-through is zero when no Greens/Cart fees present", async () => {
		const { service } = createService(
			buildQueue({
				grossByFeeType: [
					{ feeTypeName: "Member Dues", total: "75450.00" },
					{ feeTypeName: "Patron Card", total: "17885.04" },
				],
				stripeFees: [{ total: "2748.16" }],
			}),
		)

		const report = await service.getFinanceReport(1)

		expect(report.greenFees).toBe(0)
		expect(report.cartFees).toBe(0)
		expect(report.totalPassThrough).toBe(0)
	})

	test("allocates refunds proportionally across fee types", async () => {
		const { service } = createService(
			buildQueue({
				grossByFeeType: [
					{ feeTypeName: "Event Fee", total: "100.00" },
					{ feeTypeName: "Greens Fee", total: "300.00" },
				],
				refunds: [{ paymentId: 10, refundAmount: "80.00" }],
				refundFees: [
					[
						// $100 refund payment had $25 event + $75 greens = $100 total.
						// $80 refund: $20 event fee, $60 greens fee.
						{ feeTypeName: "Event Fee", amount: "25.00" },
						{ feeTypeName: "Greens Fee", amount: "75.00" },
					],
				],
			}),
		)

		const report = await service.getFinanceReport(1)

		const eventFee = report.feeTypeSums.find((f) => f.feeTypeName === "Event Fee")!
		const greensFee = report.feeTypeSums.find((f) => f.feeTypeName === "Greens Fee")!
		expect(eventFee.amount).toBeCloseTo(80, 2) // 100 - 20
		expect(greensFee.amount).toBeCloseTo(240, 2) // 300 - 60
	})

	test("Stripe fees are not reduced by refunds (Stripe keeps fees on refund)", async () => {
		// Even when there's a refund, Stripe's cost stays the full sum of
		// transaction fees on confirmed payments.
		const { service } = createService(
			buildQueue({
				grossByFeeType: [{ feeTypeName: "Event Fee", total: "500.00" }],
				refunds: [{ paymentId: 10, refundAmount: "200.00" }],
				refundFees: [[{ feeTypeName: "Event Fee", amount: "500.00" }]],
				stripeFees: [{ total: "15.00" }],
			}),
		)

		const report = await service.getFinanceReport(1)

		expect(report.stripeFees).toBe(15)
	})

	test("splits payouts into pro shop (Credit) and cash", async () => {
		const { service } = createService(
			buildQueue({
				outflows: [
					{ payoutType: "Credit", total: "450.00" },
					{ payoutType: "Cash", total: "125.00" },
				],
			}),
		)

		const report = await service.getFinanceReport(1)

		expect(report.proShopPayouts).toBe(450)
		expect(report.cashPayouts).toBe(125)
		expect(report.totalPayouts).toBe(575)
	})

	test("ignores payout types other than Credit and Cash", async () => {
		const { service } = createService(
			buildQueue({
				outflows: [
					{ payoutType: "Credit", total: "100.00" },
					{ payoutType: "Other", total: "999.00" },
				],
			}),
		)

		const report = await service.getFinanceReport(1)

		expect(report.proShopPayouts).toBe(100)
		expect(report.cashPayouts).toBe(0)
		expect(report.totalPayouts).toBe(100)
	})

	test("skips refund allocation when matched fees sum to zero", async () => {
		const { service } = createService(
			buildQueue({
				grossByFeeType: [{ feeTypeName: "Event Fee", total: "100.00" }],
				refunds: [{ paymentId: 10, refundAmount: "50.00" }],
				refundFees: [[]], // no matching fees — shouldn't throw, refund ignored
			}),
		)

		const report = await service.getFinanceReport(1)

		const eventFee = report.feeTypeSums.find((f) => f.feeTypeName === "Event Fee")!
		expect(eventFee.amount).toBe(100)
	})
})

describe("ReportsService.generateFinanceReportExcel", () => {
	async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
		const workbook = new ExcelJS.Workbook()
		await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
		return workbook
	}

	function collectRows(worksheet: ExcelJS.Worksheet): Array<[string, unknown]> {
		const rows: Array<[string, unknown]> = []
		worksheet.eachRow((row) => {
			const label = row.getCell(1).value
			const amount = row.getCell(2).value
			if (typeof label === "string" && label.length > 0) {
				rows.push([label, amount])
			}
		})
		return rows
	}

	test("renders Stripe fees line in the collected section, before total collected online", async () => {
		const { service } = createService(
			buildQueue({
				grossByFeeType: [
					{ feeTypeName: "Event Fee", total: "1475.00" },
					{ feeTypeName: "Greens Fee", total: "1866.00" },
				],
				stripeFees: [{ total: "202.73" }],
			}),
		)

		const buffer = await service.generateFinanceReportExcel(1)

		const workbook = await loadWorkbook(buffer)
		const sheet = workbook.getWorksheet("Finance Report")!
		const rows = collectRows(sheet)

		const labels = rows.map(([label]) => label)
		const stripeIdx = labels.indexOf("Stripe fees")
		const totalOnlineIdx = labels.indexOf("Total collected online")
		const eventFeeIdx = labels.indexOf("Event Fee")

		expect(stripeIdx).toBeGreaterThan(eventFeeIdx)
		expect(stripeIdx).toBeLessThan(totalOnlineIdx)

		// The Stripe fee row carries the numeric value.
		expect(rows[stripeIdx][1]).toBeCloseTo(202.73, 2)
	})

	test("total collected online equals sum of base fees plus Stripe fees", async () => {
		const { service } = createService(
			buildQueue({
				grossByFeeType: [
					{ feeTypeName: "Event Fee", total: "1475.00" },
					{ feeTypeName: "Greens Fee", total: "1866.00" },
				],
				stripeFees: [{ total: "202.73" }],
			}),
		)

		const buffer = await service.generateFinanceReportExcel(1)
		const workbook = await loadWorkbook(buffer)
		const sheet = workbook.getWorksheet("Finance Report")!
		const rows = collectRows(sheet)

		const totalOnline = rows.find(([label]) => label === "Total collected online")!
		expect(totalOnline[1]).toBeCloseTo(1475 + 1866 + 202.73, 2)
	})

	test("pass-through section uses base greens + cart fees only", async () => {
		const { service } = createService(
			buildQueue({
				grossByFeeType: [
					{ feeTypeName: "Event Fee", total: "500.00" },
					{ feeTypeName: "Greens Fee", total: "1866.00" },
					{ feeTypeName: "Cart Fee", total: "294.00" },
				],
				stripeFees: [{ total: "75.00" }],
			}),
		)

		const buffer = await service.generateFinanceReportExcel(1)
		const workbook = await loadWorkbook(buffer)
		const sheet = workbook.getWorksheet("Finance Report")!
		const rows = collectRows(sheet)

		const totalPassThrough = rows.find(([label]) => label === "Total pass-through fees")!
		expect(totalPassThrough[1]).toBeCloseTo(2160, 2)
	})
})

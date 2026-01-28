import { and, eq, sql } from "drizzle-orm"

import { Inject, Injectable } from "@nestjs/common"
import { getAge, getFullName, getPlayerStartName, getPlayerTeamName } from "@repo/domain/functions"
import {
	EventReportRow,
	EventResultsReport,
	EventResultsReportRow,
	EventResultsSection,
	FinanceReportSummary,
	Hole,
	PaymentReportDetail,
	PaymentReportRefund,
	PaymentReportRow,
	PointsReportRow,
	TournamentFormatChoices,
	TournamentFormatValue,
	RegisteredPlayer,
} from "@repo/domain/types"

import { CoursesService, toHole } from "../courses"
import {
	authUser,
	DrizzleService,
	eventFee,
	feeType,
	payment,
	player,
	refund,
	registrationFee,
	registrationSlot,
	tournament,
	tournamentPoints,
	tournamentResult,
} from "../database"
import { EventsService } from "../events"
import { PlayerService } from "../registration"
import {
	addDataRows,
	addFixedColumns,
	createWorkbook,
	deriveDynamicColumns,
	generateBuffer,
	styleHeaderRow,
} from "./excel.utils"

interface MembershipReport {
	season: number
	members: Array<{ id: number; name: string; status: "active" | "inactive" }>
}

interface ResultsReport {
	eventId: number
	results: Array<{ playerId: number; position: number; score: number }>
}

interface EventPlayerFee {
	name: string
	amount: string
}

interface EventPlayerSlot {
	team: string
	course: string
	start: string
	ghin?: string | null
	age: number
	tee?: string | null
	lastName: string
	firstName: string
	fullName: string
	email?: string | null
	signedUpBy?: string | null
	signupDate?: string | null
	fees: EventPlayerFee[]
}

@Injectable()
export class ReportsService {
	constructor(
		@Inject(CoursesService) private readonly courses: CoursesService,
		@Inject(EventsService) private readonly events: EventsService,
		@Inject(PlayerService) private readonly players: PlayerService,
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
	) {}

	private async validateEvent(eventId: number): Promise<void> {
		const exists = await this.events.exists(eventId)
		if (!exists) {
			throw new Error(`Event with id ${eventId} does not exist.`)
		}
	}

	async getPaymentReport(eventId: number): Promise<PaymentReportRow[]> {
		await this.validateEvent(eventId)

		// Get confirmed payments for the event with user name
		const payments = await this.drizzle.db
			.select({
				id: payment.id,
				paymentCode: payment.paymentCode,
				paymentDate: payment.paymentDate,
				confirmDate: payment.confirmDate,
				paymentAmount: payment.paymentAmount,
				transactionFee: payment.transactionFee,
				firstName: authUser.firstName,
				lastName: authUser.lastName,
			})
			.from(payment)
			.innerJoin(authUser, eq(payment.userId, authUser.id))
			.where(and(eq(payment.eventId, eventId), eq(payment.confirmed, 1)))

		const rows: PaymentReportRow[] = await Promise.all(
			payments.map(async (p) => {
				// Fetch registration fee details with player and fee type
				const feeRows = await this.drizzle.db
					.select({
						firstName: player.firstName,
						lastName: player.lastName,
						feeTypeName: feeType.name,
						amount: registrationFee.amount,
						isPaid: registrationFee.isPaid,
					})
					.from(registrationFee)
					.innerJoin(eventFee, eq(registrationFee.eventFeeId, eventFee.id))
					.innerJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
					.leftJoin(registrationSlot, eq(registrationFee.registrationSlotId, registrationSlot.id))
					.leftJoin(player, eq(registrationSlot.playerId, player.id))
					.where(eq(registrationFee.paymentId, p.id))

				const details: PaymentReportDetail[] = feeRows.map((f) => ({
					player: f.firstName && f.lastName ? `${f.firstName} ${f.lastName}` : "",
					eventFee: f.feeTypeName,
					amount: parseFloat(f.amount.toString()),
					isPaid: f.isPaid === 1,
				}))

				// Fetch refunds (confirmed and unconfirmed)
				const refundRows = await this.drizzle.db
					.select({
						refundCode: refund.refundCode,
						refundAmount: refund.refundAmount,
						refundDate: refund.refundDate,
						confirmed: refund.confirmed,
						issuerFirstName: authUser.firstName,
						issuerLastName: authUser.lastName,
					})
					.from(refund)
					.innerJoin(authUser, eq(refund.issuerId, authUser.id))
					.where(eq(refund.paymentId, p.id))

				const refunds: PaymentReportRefund[] = refundRows.map((r) => ({
					refundCode: r.refundCode,
					refundAmount: parseFloat(r.refundAmount.toString()),
					refundDate: r.refundDate || "",
					confirmed: r.confirmed === 1,
					issuedBy: `${r.issuerFirstName} ${r.issuerLastName}`,
				}))

				const amountRefunded = refunds.reduce((sum, r) => sum + r.refundAmount, 0)

				return {
					userName: `${p.firstName} ${p.lastName}`,
					paymentId: p.id,
					paymentCode: p.paymentCode,
					paymentDate: p.paymentDate || "",
					confirmDate: p.confirmDate || "",
					amountPaid: parseFloat(p.paymentAmount.toString()),
					transactionFee: parseFloat(p.transactionFee.toString()),
					amountRefunded,
					details,
					refunds,
				}
			}),
		)

		return rows
	}

	async getMembershipReport(season: number): Promise<MembershipReport> {
		// Stub: Return mock data
		return await Promise.resolve({
			season,
			members: [
				{ id: 1, name: "John Doe", status: "active" },
				{ id: 2, name: "Jane Smith", status: "active" },
			],
		})
	}

	async getPlayers(eventId: number): Promise<EventPlayerSlot[]> {
		const event = await this.events.getCompleteClubEventById(eventId, false)
		if (!event) {
			throw new Error("Event not found")
		}
		const registeredPlayers = await this.players.getRegisteredPlayers(eventId)

		if (!registeredPlayers || registeredPlayers.length === 0) return []

		// Build registration groups (registrationId => SlotWithRelations[])
		const regGroups = new Map<number, RegisteredPlayer[]>()
		for (const s of registeredPlayers) {
			const regId = s.registration?.id ?? null
			if (regId === null) continue
			const arr = regGroups.get(regId) ?? []
			arr.push(s)
			regGroups.set(regId, arr)
		}

		// Collect unique courseIds to fetch holes
		const courseIdSet = new Set<number>()
		for (const s of registeredPlayers) {
			if (!s) continue
			const cid = s.course?.id ?? s.registration?.courseId
			if (cid !== null && cid !== undefined) courseIdSet.add(cid)
		}

		const courseIds = Array.from(courseIdSet)
		const holesMap = new Map<number, Hole[]>()
		await Promise.all(
			courseIds.map(async (cid) => {
				const holes = await this.courses.findHolesByCourseId(cid)
				holesMap.set(
					cid,
					holes.map((h) => toHole(h)),
				)
			}),
		)

		const transformed = registeredPlayers.map((registeredPlayer): EventPlayerSlot => {
			const player = registeredPlayer.player
			const registration = registeredPlayer.registration

			// Get derived column values
			const playerGroup = (regGroups.get(registration.id) ?? []).map(
				(x: RegisteredPlayer) => x.slot,
			)
			const startValue = getPlayerStartName(event, registeredPlayer)
			const team = getPlayerTeamName(event, registeredPlayer, playerGroup)
			const ageRes = getAge(player, new Date())
			const age = typeof ageRes.age === "number" ? ageRes.age : 0
			const fullName = getFullName(player)
			const courseName = registeredPlayer.course?.name ?? "N/A"

			// Build fees array from the fee definitions
			const fees: EventPlayerFee[] = event.eventFees.map((fd) => {
				const fee = (registeredPlayer.fees ?? []).find((f) => f.eventFee?.id === fd.id)
				const paid = fee?.isPaid
				const amount = paid ? fee?.amount : "0"
				return {
					name: fd.feeType.name,
					amount: amount.toString(),
				}
			})

			return {
				team,
				course: courseName,
				start: startValue,
				ghin: player.ghin,
				age,
				tee: player.tee,
				lastName: player.lastName,
				firstName: player.firstName,
				fullName,
				email: player.email,
				signedUpBy: registration.signedUpBy,
				fees,
			}
		})

		return transformed
	}

	async getEventReport(eventId: number): Promise<EventReportRow[]> {
		await this.validateEvent(eventId)
		const registeredPlayers = await this.getPlayers(eventId)
		const summary = { eventId, total: registeredPlayers.length, slots: registeredPlayers }
		const rows = summary.slots.map((slot) => {
			const row: EventReportRow = {
				teamId: slot.team,
				course: slot.course,
				start: slot.start,
				ghin: slot.ghin || "",
				age: slot.age ? slot.age.toString() : "n/a",
				tee: slot.tee || "",
				lastName: slot.lastName,
				firstName: slot.firstName,
				fullName: slot.fullName,
				email: slot.email || "",
				signedUpBy: slot.signedUpBy || "",
				signupDate: slot.signupDate || "",
			}
			for (const fee of slot.fees) {
				row[fee.name] = fee.amount
			}
			return row
		})

		return rows.sort((a, b) => a.teamId.localeCompare(b.teamId))
	}

	async generateEventReportExcel(eventId: number): Promise<Buffer> {
		const rows = await this.getEventReport(eventId)

		const workbook = createWorkbook()
		const worksheet = workbook.addWorksheet("ClubEvent Report")

		// Define fixed columns
		const fixedKeys = [
			"teamId",
			"course",
			"start",
			"ghin",
			"age",
			"tee",
			"lastName",
			"firstName",
			"fullName",
			"email",
			"signedUpBy",
			"signupDate",
		]
		const fixedColumns = [
			{ header: "Team", key: "teamId", width: 15 },
			{ header: "Course", key: "course", width: 20 },
			{ header: "Start", key: "start", width: 15 },
			{ header: "GHIN", key: "ghin", width: 10 },
			{ header: "Age", key: "age", width: 8 },
			{ header: "Tee", key: "tee", width: 10 },
			{ header: "Last Name", key: "lastName", width: 15 },
			{ header: "First Name", key: "firstName", width: 15 },
			{ header: "Full Name", key: "fullName", width: 20 },
			{ header: "Email", key: "email", width: 25 },
			{ header: "Signed Up By", key: "signedUpBy", width: 15 },
			{ header: "Signup Date", key: "signupDate", width: 12 },
		]

		// Add dynamic fee columns
		const dynamicColumns = deriveDynamicColumns(rows, fixedKeys)
		const allColumns = [...fixedColumns, ...dynamicColumns]

		addFixedColumns(worksheet, allColumns)
		styleHeaderRow(worksheet, 1)
		addDataRows(worksheet, 2, rows, allColumns)

		return generateBuffer(workbook)
	}

	async getPointsReport(eventId: number): Promise<PointsReportRow[]> {
		await this.validateEvent(eventId)

		// Get tournament points with tournament and player data
		const results = await this.drizzle.db
			.select({
				tournamentName: tournament.name,
				position: tournamentPoints.position,
				score: tournamentPoints.score,
				points: tournamentPoints.points,
				details: tournamentPoints.details,
				isNet: tournament.isNet,
				firstName: player.firstName,
				lastName: player.lastName,
				ghin: player.ghin,
			})
			.from(tournamentPoints)
			.innerJoin(tournament, eq(tournamentPoints.tournamentId, tournament.id))
			.innerJoin(player, eq(tournamentPoints.playerId, player.id))
			.where(eq(tournament.eventId, eventId))
			.orderBy(tournament.name, tournamentPoints.position)

		// Map to DTO
		const rows: PointsReportRow[] = results.map((result) => ({
			tournamentName: result.tournamentName,
			position: result.position,
			fullName: `${result.firstName} ${result.lastName}`,
			ghin: result.ghin || "",
			score: result.score,
			points: result.points,
			type: result.isNet ? "Net" : "Gross",
			details: result.details,
		}))

		return rows
	}

	async generatePointsReportExcel(eventId: number): Promise<Buffer> {
		const rows = await this.getPointsReport(eventId)

		const workbook = createWorkbook()
		const worksheet = workbook.addWorksheet("Points Report")

		const fixedColumns = [
			{ header: "Tournament Name", key: "tournamentName", width: 20 },
			{ header: "Position", key: "position", width: 10 },
			{ header: "Full Name", key: "fullName", width: 20 },
			{ header: "GHIN", key: "ghin", width: 10 },
			{ header: "Score", key: "score", width: 8 },
			{ header: "Points", key: "points", width: 8 },
			{ header: "Type", key: "type", width: 8 },
			{ header: "Details", key: "details", width: 20 },
		]

		addFixedColumns(worksheet, fixedColumns)
		styleHeaderRow(worksheet, 1)
		addDataRows(worksheet, 2, rows as unknown as Record<string, unknown>[], fixedColumns)

		return generateBuffer(workbook)
	}

	async getFinanceReport(eventId: number): Promise<FinanceReportSummary> {
		await this.validateEvent(eventId)

		// Get gross inflows by bucket
		const inflows = await this.drizzle.db
			.select({
				bucket: feeType.payout,
				total: sql<number>`sum(${registrationFee.amount})`.as("total"),
			})
			.from(payment)
			.innerJoin(registrationFee, eq(payment.id, registrationFee.paymentId))
			.innerJoin(eventFee, eq(registrationFee.eventFeeId, eventFee.id))
			.innerJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
			.where(eq(payment.eventId, eventId))
			.groupBy(feeType.payout)

		let creditCollected = 0
		let cashCollected = 0
		let passthruCollected = 0

		for (const inflow of inflows) {
			const amount = parseFloat(inflow.total.toString())
			if (inflow.bucket === "Credit") creditCollected += amount
			else if (inflow.bucket === "Cash") cashCollected += amount
			else if (inflow.bucket === "Passthru") passthruCollected += amount
		}

		const totalCollected = creditCollected + cashCollected + passthruCollected

		// Get refunds and allocate by bucket
		const refunds = await this.drizzle.db
			.select({
				paymentId: refund.paymentId,
				refundAmount: refund.refundAmount,
			})
			.from(refund)
			.innerJoin(payment, eq(refund.paymentId, payment.id))
			.where(and(eq(payment.eventId, eventId), eq(refund.confirmed, 1)))

		let creditRefunds = 0
		let cashRefunds = 0
		let passthruRefunds = 0

		for (const r of refunds) {
			const fees = await this.drizzle.db
				.select({
					bucket: feeType.payout,
					amount: registrationFee.amount,
				})
				.from(registrationFee)
				.innerJoin(eventFee, eq(registrationFee.eventFeeId, eventFee.id))
				.innerJoin(feeType, eq(eventFee.feeTypeId, feeType.id))
				.innerJoin(payment, eq(registrationFee.paymentId, payment.id))
				.where(eq(payment.id, r.paymentId))

			let totalFees = 0
			for (const f of fees) {
				totalFees += parseFloat(f.amount.toString())
			}

			if (totalFees > 0) {
				for (const f of fees) {
					const proportion = parseFloat(f.amount.toString()) / totalFees
					const allocated = parseFloat(r.refundAmount.toString()) * proportion
					if (f.bucket === "Credit") creditRefunds += allocated
					else if (f.bucket === "Cash") cashRefunds += allocated
					else if (f.bucket === "Passthru") passthruRefunds += allocated
				}
			}
		}

		const totalRefunds = creditRefunds + cashRefunds + passthruRefunds

		// Net inflows
		const creditNet = creditCollected - creditRefunds
		const cashNet = cashCollected - cashRefunds
		const passthruNet = passthruCollected - passthruRefunds

		// Get outflows by bucket and format
		const outflows = await this.drizzle.db
			.select({
				bucket: tournamentResult.payoutType,
				format: tournament.format,
				total: sql<number>`sum(${tournamentResult.amount})`.as("total"),
			})
			.from(tournamentResult)
			.innerJoin(tournament, eq(tournamentResult.tournamentId, tournament.id))
			.where(and(eq(tournament.eventId, eventId), sql`${tournamentResult.amount} > 0`))
			.groupBy(tournamentResult.payoutType, tournament.format)

		const creditPayouts: Record<string, number> = {}
		const cashPayouts: Record<string, number> = {}
		let creditTotalPayouts = 0
		let cashTotalPayouts = 0

		for (const outflow of outflows) {
			const amount = parseFloat(outflow.total.toString())
			const bucket = outflow.bucket
			const format = outflow.format
			if (bucket === "Credit" && format) {
				creditPayouts[format] = (creditPayouts[format] || 0) + amount
				creditTotalPayouts += amount
			} else if (bucket === "Cash" && format) {
				cashPayouts[format] = (cashPayouts[format] || 0) + amount
				cashTotalPayouts += amount
			}
		}

		return {
			eventId,
			creditCollected,
			cashCollected,
			passthruCollected,
			totalCollected,
			creditRefunds,
			cashRefunds,
			passthruRefunds,
			totalRefunds,
			creditNet,
			cashNet,
			passthruNet,
			creditPayouts,
			creditTotalPayouts,
			cashPayouts,
			cashTotalPayouts,
		}
	}

	async generatePaymentReportExcel(eventId: number): Promise<Buffer> {
		const rows = await this.getPaymentReport(eventId)

		const workbook = createWorkbook()
		const worksheet = workbook.addWorksheet("Payment Report")

		const fixedColumns = [
			{ header: "User Name", key: "userName", width: 20 },
			{ header: "Payment ID", key: "paymentId", width: 12 },
			{ header: "Payment Code", key: "paymentCode", width: 15 },
			{ header: "Payment Date", key: "paymentDate", width: 15 },
			{ header: "Confirm Date", key: "confirmDate", width: 15 },
			{ header: "Amount Paid", key: "amountPaid", width: 12 },
			{ header: "Transaction Fee", key: "transactionFee", width: 15 },
			{ header: "Amount Refunded", key: "amountRefunded", width: 15 },
		]

		addFixedColumns(worksheet, fixedColumns)
		styleHeaderRow(worksheet, 1)
		addDataRows(worksheet, 2, rows as unknown as Record<string, unknown>[], fixedColumns)

		return generateBuffer(workbook)
	}

	async generateFinanceReportExcel(eventId: number): Promise<Buffer> {
		const report = await this.getFinanceReport(eventId)

		const workbook = createWorkbook()
		const worksheet = workbook.addWorksheet("Finance Report")

		// Define fixed columns
		const fixedColumns = [
			{ header: "Bucket", key: "bucket", width: 15 },
			{ header: "Gross Collected", key: "grossCollected", width: 15 },
			{ header: "Refunds", key: "refunds", width: 15 },
			{ header: "Net Inflow", key: "netInflow", width: 15 },
			{ header: "Total Payouts", key: "totalPayouts", width: 15 },
			{ header: "Net Profit", key: "netProfit", width: 15 },
		]

		const allColumns = fixedColumns

		// Prepare data rows
		const rows = [
			{
				bucket: "Credit",
				grossCollected: report.creditCollected,
				refunds: report.creditRefunds,
				netInflow: report.creditNet,
				totalPayouts: report.creditTotalPayouts,
				netProfit: report.creditNet - report.creditTotalPayouts,
			},
			{
				bucket: "Cash",
				grossCollected: report.cashCollected,
				refunds: report.cashRefunds,
				netInflow: report.cashNet,
				totalPayouts: report.cashTotalPayouts,
				netProfit: report.cashNet - report.cashTotalPayouts,
			},
			{
				bucket: "Passthru",
				grossCollected: report.passthruCollected,
				refunds: report.passthruRefunds,
				netInflow: report.passthruNet,
				totalPayouts: 0, // No payouts for passthru
				netProfit: report.passthruNet - 0,
			},
		]

		addFixedColumns(worksheet, allColumns)
		styleHeaderRow(worksheet, 1)
		addDataRows(worksheet, 2, rows as unknown as Record<string, unknown>[], allColumns)

		return generateBuffer(workbook)
	}

	async getResultsReport(eventId: number): Promise<ResultsReport> {
		// Stub: Mock results
		return await Promise.resolve({
			eventId,
			results: [
				{ playerId: 1, position: 1, score: 72 },
				{ playerId: 2, position: 2, score: 75 },
			],
		})
	}

	async getEventResultsReport(eventId: number): Promise<EventResultsReport> {
		const event = await this.events.getCompleteClubEventById(eventId)
		if (!event) throw new Error(`ClubEvent ${eventId} not found`) // Should not happen after validateEvent

		// Get all tournaments for the event
		const tournaments = event.tournaments

		const sections: EventResultsSection[] = []

		// Section 1: Scoring tournament results (stroke, stableford, quota, team)
		const scoringFormats: TournamentFormatValue[] = [
			TournamentFormatChoices.STROKE,
			TournamentFormatChoices.STABLEFORD,
			TournamentFormatChoices.QUOTA,
			TournamentFormatChoices.TEAM,
		]
		const scoringTournaments = tournaments.filter(
			(t) => scoringFormats.includes(t.format) && t.name.toLowerCase() !== "overall",
		)
		if (scoringTournaments.length > 0) {
			const subSections = await Promise.all(
				scoringTournaments.map(async (tournament) => {
					const results = await this.drizzle.db
						.select({
							flight: tournamentResult.flight,
							position: tournamentResult.position,
							score: tournamentResult.score,
							amount: tournamentResult.amount,
							details: tournamentResult.details,
							firstName: player.firstName,
							lastName: player.lastName,
						})
						.from(tournamentResult)
						.innerJoin(player, eq(tournamentResult.playerId, player.id))
						.where(eq(tournamentResult.tournamentId, tournament.id))
						.orderBy(tournamentResult.flight, tournamentResult.position)

					const rows: EventResultsReportRow[] = results.map((result) => ({
						flight: result.flight || undefined,
						position: result.position,
						fullName: `${result.firstName} ${result.lastName}`,
						score: result.score || undefined,
						amount: parseFloat(result.amount),
						team: result.details || undefined,
					}))

					return {
						header: tournament.name,
						rows,
					}
				}),
			)

			sections.push({
				type: "stroke",
				header: `${event.name} Results`,
				subSections,
			})
		}

		// Section 2: Skins results
		const skinsTournaments = tournaments.filter((t) => t.format === TournamentFormatChoices.SKINS)
		if (skinsTournaments.length > 0) {
			const subSections = await Promise.all(
				skinsTournaments.map(async (tournament) => {
					const results = await this.drizzle.db
						.select({
							position: tournamentResult.position,
							amount: tournamentResult.amount,
							summary: tournamentResult.summary,
							firstName: player.firstName,
							lastName: player.lastName,
						})
						.from(tournamentResult)
						.innerJoin(player, eq(tournamentResult.playerId, player.id))
						.where(eq(tournamentResult.tournamentId, tournament.id))
						.orderBy(tournamentResult.summary)

					const rows: EventResultsReportRow[] = results.map((result) => ({
						details: result.summary || undefined,
						skinsWon: result.position,
						fullName: `${result.firstName} ${result.lastName}`,
						amount: parseFloat(result.amount),
					}))

					return {
						header: tournament.name,
						rows,
					}
				}),
			)

			sections.push({
				type: "skins",
				header: `${event.name} Skins`,
				subSections,
			})
		}

		// Section 3: User scored results
		const proxyTournaments = tournaments.filter(
			(t) => t.format === TournamentFormatChoices.USER_SCORED,
		)
		if (proxyTournaments.length > 0) {
			const rows: EventResultsReportRow[] = await Promise.all(
				proxyTournaments.map(async (tournament) => {
					const result = await this.drizzle.db
						.select({
							amount: tournamentResult.amount,
							firstName: player.firstName,
							lastName: player.lastName,
						})
						.from(tournamentResult)
						.innerJoin(player, eq(tournamentResult.playerId, player.id))
						.where(eq(tournamentResult.tournamentId, tournament.id))
						.orderBy(tournamentResult.position)
						.limit(1)
						.then((results) => results[0])

					return {
						tournamentName: tournament.name,
						fullName: result ? `${result.firstName} ${result.lastName}` : "",
						amount: result ? parseFloat(result.amount) : 0,
					}
				}),
			)

			sections.push({
				type: "proxies",
				header: `${event.name} Proxies`,
				rows,
			})
		}

		return {
			eventName: event.name,
			sections,
			emptyRow: {},
		}
	}

	async generateEventResultsReportExcel(eventId: number): Promise<Buffer> {
		const report = await this.getEventResultsReport(eventId)

		const workbook = createWorkbook()
		const worksheet = workbook.addWorksheet("ClubEvent Results")

		let currentRow = 1

		for (const section of report.sections) {
			// Add section header
			const headerRow = worksheet.getRow(currentRow)
			headerRow.getCell(1).value = section.header
			headerRow.font = { bold: true, size: 14 }
			currentRow++

			if (section.type === "stroke" || section.type === "skins") {
				// Handle sections with sub-sections
				for (const subSection of section.subSections) {
					// Add sub-section header
					const subHeaderRow = worksheet.getRow(currentRow)
					subHeaderRow.getCell(1).value = subSection.header
					subHeaderRow.font = { bold: true, size: 12 }
					currentRow++

					// Add column headers based on section type
					let columns: Array<{ header: string; key: keyof EventResultsReportRow; width: number }>
					if (section.type === "stroke") {
						columns = [
							{ header: "Flight", key: "flight", width: 10 },
							{ header: "Position", key: "position", width: 10 },
							{ header: "Player Full Name", key: "fullName", width: 20 },
							{ header: "Score", key: "score", width: 8 },
							{ header: "Amount", key: "amount", width: 10 },
							{ header: "Team", key: "team", width: 15 },
						]
					} else {
						// skins
						columns = [
							{ header: "Details", key: "details", width: 15 },
							{ header: "Skins Won", key: "skinsWon", width: 10 },
							{ header: "Player Full Name", key: "fullName", width: 20 },
							{ header: "", key: "flight", width: 5 }, // empty
							{ header: "Amount", key: "amount", width: 10 },
							{ header: "", key: "position", width: 5 }, // empty
						]
					}

					// Set column headers
					for (let i = 0; i < columns.length; i++) {
						worksheet.getRow(currentRow).getCell(i + 1).value = columns[i].header
					}
					worksheet.getRow(currentRow).font = { bold: true }
					currentRow++

					// Add data rows
					for (const row of subSection.rows) {
						for (let i = 0; i < columns.length; i++) {
							const value = row[columns[i].key]
							worksheet.getRow(currentRow).getCell(i + 1).value = value || ""
						}
						currentRow++
					}

					// Add empty row after sub-section
					currentRow++
				}
			} else if (section.type === "proxies") {
				// Handle proxies section
				const columns = [
					{ header: "Tournament Name", key: "tournamentName", width: 20 },
					{ header: "", key: "flight", width: 5 }, // empty
					{ header: "Player Full Name", key: "fullName", width: 20 },
					{ header: "", key: "position", width: 5 }, // empty
					{ header: "Amount", key: "amount", width: 10 },
					{ header: "", key: "score", width: 5 }, // empty
				]

				// Set column headers
				for (let i = 0; i < columns.length; i++) {
					worksheet.getRow(currentRow).getCell(i + 1).value = columns[i].header
				}
				worksheet.getRow(currentRow).font = { bold: true }
				currentRow++

				// Add data rows
				for (const row of section.rows) {
					worksheet.getRow(currentRow).getCell(1).value = row.tournamentName || "" // Tournament name
					worksheet.getRow(currentRow).getCell(2).value = "" // empty
					worksheet.getRow(currentRow).getCell(3).value = row.fullName || ""
					worksheet.getRow(currentRow).getCell(4).value = "" // empty
					worksheet.getRow(currentRow).getCell(5).value = row.amount || ""
					worksheet.getRow(currentRow).getCell(6).value = "" // empty
					currentRow++
				}

				// Add empty row after section
				currentRow++
			}

			// Add empty row between sections
			currentRow++
		}

		// Set column widths
		worksheet.columns = [
			{ width: 20 }, // Column 1
			{ width: 5 }, // Column 2
			{ width: 20 }, // Column 3
			{ width: 5 }, // Column 4
			{ width: 10 }, // Column 5
			{ width: 15 }, // Column 6
		]

		return generateBuffer(workbook)
	}
}

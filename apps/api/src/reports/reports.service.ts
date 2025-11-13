import { eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"
import {
	EventPlayerFeeDto,
	EventPlayerSlotDto,
	EventRegistrationSummaryDto,
	EventReportRowDto,
	EventResultsReportDto,
	EventResultsReportRowDto,
	EventResultsSectionDto,
	PointsReportRowDto,
} from "@repo/dto"

import { CoursesService, HoleDto } from "../courses"
import { DrizzleService, player, tournament, tournamentPoints, tournamentResult } from "../database"
import { EventFeeWithTypeDto, EventsDomainService, EventsService } from "../events"
import {
	RegisteredPlayerDto,
	RegistrationDomainService,
	RegistrationService,
} from "../registration"
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

interface FinanceReport {
	eventId: number
	collected: number
	outstanding: number
	payouts: number
}

interface ResultsReport {
	eventId: number
	results: Array<{ playerId: number; position: number; score: number }>
}

@Injectable()
export class ReportsService {
	constructor(
		private readonly events: EventsService,
		private readonly registration: RegistrationService,
		private readonly courses: CoursesService,
		private readonly eventsDomain: EventsDomainService,
		private readonly registrationDomain: RegistrationDomainService,
		private readonly drizzle: DrizzleService,
	) {}

	private async validateEvent(eventId: number): Promise<void> {
		const event = await this.events.findEventById(eventId)
		if (!event) {
			throw new Error(`Event ${eventId} not found`)
		}
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

	async getPlayersByEvent(eventId: number): Promise<EventRegistrationSummaryDto> {
		const event = await this.events.findEventById(eventId)
		const eventFees = await this.events.listEventFeesByEvent(eventId)
		const slots = await this.registration.getRegisteredPlayers(eventId)

		if (!slots || slots.length === 0) return { eventId, total: 0, slots: [] }

		// Validate event
		if (!event) throw new Error(`Event ${eventId} not found`)

		// Build registration groups (registrationId => SlotWithRelations[])
		const regGroups = new Map<number, RegisteredPlayerDto[]>()
		for (const s of slots) {
			if (!s) continue
			const regId = s.registration?.id ?? null
			if (regId === null) continue
			const arr = regGroups.get(regId) ?? []
			arr.push(s)
			regGroups.set(regId, arr)
		}

		// Collect unique courseIds to fetch holes
		const courseIdSet = new Set<number>()
		for (const s of slots) {
			if (!s) continue
			const cid = s.course?.id ?? s.registration?.courseId
			if (cid !== null && cid !== undefined) courseIdSet.add(cid)
		}

		const courseIds = Array.from(courseIdSet)
		const holesMap = new Map<number, HoleDto[]>()
		await Promise.all(
			courseIds.map(async (cid) => {
				const holes = await this.courses.findHolesByCourseId(cid)
				holesMap.set(cid, holes ?? [])
			}),
		)

		// Prepare fee types list and names
		const feeDefinitions = (eventFees ?? []).map((ef: EventFeeWithTypeDto) => {
			return {
				eventFee: ef.eventFee,
				feeType: ef.feeType,
				name: ef.feeType?.name ?? String(ef.feeType?.id ?? ef.eventFee?.id),
			}
		})

		const transformed = slots.map((s): EventPlayerSlotDto => {
			if (!s) throw new Error("Unexpected missing slot data")
			const slot = s.slot
			const player = s.player
			const registration = s.registration
			const course = s.course

			if (!player) throw new Error(`Missing player for slot id ${slot?.id}`)
			if (!registration) throw new Error(`Missing registration for slot id ${slot?.id}`)

			// If the event does not allow choosing a course, there will be no course info.
			// In that case we return "N/A" for course/start values. Otherwise require course.
			let courseName = "N/A"
			let holes: HoleDto[] = []
			if (event.canChoose) {
				if (!course) throw new Error(`Missing course for slot id ${slot?.id}`)
				courseName = course.name
				holes = holesMap.get(course.id!) ?? []
			}

			// Derived columns
			const startValue = this.eventsDomain.deriveStart(event, slot, holes)
			const team = this.eventsDomain.deriveTeam(
				event,
				slot,
				holes,
				courseName,
				regGroups.get(registration.id!) ?? [],
			)
			const age = this.registrationDomain.derivePlayerAge(player)
			const fullName = this.registrationDomain.derivePlayerName(player)

			// Build fees array from the fee definitions
			const fees: EventPlayerFeeDto[] = feeDefinitions.map((fd) => {
				const fee = (s.fees ?? []).find((f) => f.eventFee?.id === fd.eventFee?.id)
				const paid = fee?.isPaid === 1
				const amount = paid ? fee?.amount : "0"
				return {
					name: fd.name,
					amount,
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
				signupDate: registration.createdDate
					? new Date(registration.createdDate).toISOString().split("T")[0]
					: null,
				fees,
			}
		})

		return { eventId, total: transformed.length, slots: transformed }
	}

	async getEventReport(eventId: number): Promise<EventReportRowDto[]> {
		await this.validateEvent(eventId)
		const summary = await this.getPlayersByEvent(eventId)
		const rows = summary.slots.map((slot) => {
			const row: EventReportRowDto = {
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

		const workbook = await createWorkbook()
		const worksheet = workbook.addWorksheet("Event Report")

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

	async getPointsReport(eventId: number): Promise<PointsReportRowDto[]> {
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
		const rows: PointsReportRowDto[] = results.map((result) => ({
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

		const workbook = await createWorkbook()
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

	async getFinanceReport(eventId: number): Promise<FinanceReport> {
		// Stub: Mock finances
		return await Promise.resolve({
			eventId,
			collected: 400,
			outstanding: 100,
			payouts: 300,
		})
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

	async getEventResultsReport(eventId: number): Promise<EventResultsReportDto> {
		await this.validateEvent(eventId)
		const event = await this.events.findEventById(eventId)
		if (!event) throw new Error(`Event ${eventId} not found`) // Should not happen after validateEvent

		// Get all tournaments for the event
		const tournaments = await this.drizzle.db
			.select()
			.from(tournament)
			.where(eq(tournament.eventId, eventId))
			.orderBy(tournament.name)

		const sections: EventResultsSectionDto[] = []

		// Section 1: Stroke play results
		const strokeTournaments = tournaments.filter(
			(t) => t.format === "stroke" && t.name !== "Overall",
		)
		if (strokeTournaments.length > 0) {
			const subSections = await Promise.all(
				strokeTournaments.map(async (tournament) => {
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

					const rows: EventResultsReportRowDto[] = results.map((result) => ({
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
		const skinsTournaments = tournaments.filter((t) => t.format === "skins")
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

					const rows: EventResultsReportRowDto[] = results.map((result) => ({
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
		const proxyTournaments = tournaments.filter((t) => t.format === "user_scored")
		if (proxyTournaments.length > 0) {
			const rows: EventResultsReportRowDto[] = await Promise.all(
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

		const workbook = await createWorkbook()
		const worksheet = workbook.addWorksheet("Event Results")

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
					let columns: Array<{ header: string; key: keyof EventResultsReportRowDto; width: number }>
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

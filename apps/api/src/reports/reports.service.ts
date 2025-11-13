import { eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"
import {
	EventPlayerFeeDto,
	EventPlayerSlotDto,
	EventRegistrationSummaryDto,
	EventReportRowDto,
	PointsReportRowDto,
} from "@repo/dto"

import { CoursesService, HoleDto } from "../courses"
import { DrizzleService, player, tournament, tournamentPoints } from "../database"
import { EventFeeWithTypeDto, EventsDomainService, EventsService } from "../events"
import {
	RegisteredPlayerDto,
	RegistrationDomainService,
	RegistrationService,
} from "../registration"

interface MembershipReport {
	season: number
	members: Array<{ id: number; name: string; status: "active" | "inactive" }>
}

interface PointsReport {
	eventId: number
	points: Array<{ playerId: number; points: number }>
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

		const workbook = new (await import("exceljs")).Workbook()
		const worksheet = workbook.addWorksheet("Event Report")

		// Define fixed columns
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
		if (rows.length > 0) {
			const feeKeys = Object.keys(rows[0]).filter(
				(key) => !fixedColumns.some((col) => col.key === key),
			)
			for (const feeKey of feeKeys) {
				fixedColumns.push({
					header: feeKey.replace(/([A-Z])/g, " $1").trim(),
					key: feeKey,
					width: 12,
				})
			}
		}

		// Set column headers and widths
		worksheet.columns = fixedColumns

		// Add data rows
		for (const row of rows) {
			const rowData: any[] = []
			for (const col of fixedColumns) {
				rowData.push(row[col.key as keyof EventReportRowDto] || "")
			}
			worksheet.addRow(rowData)
		}

		// Style the header row
		const headerRow = worksheet.getRow(1)
		headerRow.font = { bold: true }
		headerRow.fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FFE6E6FA" },
		}

		return Buffer.from((await workbook.xlsx.writeBuffer()) as ArrayBuffer)
	}

	async getPointsReport(eventId: number): Promise<PointsReportRowDto[]> {
		// Validate event exists
		const event = await this.events.findEventById(eventId)
		if (!event) {
			throw new Error(`Event ${eventId} not found`)
		}

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

		const workbook = new (await import("exceljs")).Workbook()
		const worksheet = workbook.addWorksheet("Points Report")

		// Define fixed columns
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

		// Set column headers and widths
		worksheet.columns = fixedColumns

		// Add data rows
		for (const row of rows) {
			const rowData: any[] = []
			for (const col of fixedColumns) {
				rowData.push(row[col.key as keyof PointsReportRowDto] || "")
			}
			worksheet.addRow(rowData)
		}

		// Style the header row
		const headerRow = worksheet.getRow(1)
		headerRow.font = { bold: true }
		headerRow.fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FFE6E6FA" },
		}

		return Buffer.from((await workbook.xlsx.writeBuffer()) as ArrayBuffer)
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
}

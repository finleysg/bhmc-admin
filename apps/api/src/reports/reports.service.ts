import { Injectable } from "@nestjs/common"
import {
	EventPlayerFeeDto,
	EventPlayerSlotDto,
	EventRegistrationSummaryDto,
	EventReportQueryDto,
	EventReportRowDto,
} from "@repo/dto"

import { CoursesService, HoleDto } from "../courses"
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

	async getEventReport(eventId: number, query: EventReportQueryDto): Promise<EventReportRowDto[]> {
		// Set default sort values if not provided
		const effectiveSort = query.sort || "team"
		const effectiveDir = query.dir || "asc"

		// Validate effective sort values
		if (!["team", "ghin", "age", "fullName"].includes(effectiveSort)) {
			throw new Error(`Invalid sort field: ${effectiveSort}`)
		}
		if (!["asc", "desc"].includes(effectiveDir)) {
			throw new Error(`Invalid sort direction: ${effectiveDir}`)
		}

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

		// Filter
		let filteredRows = rows
		if (query.filterGhin)
			filteredRows = filteredRows.filter((r) =>
				r.ghin.toLowerCase().includes(query.filterGhin!.toLowerCase()),
			)
		if (query.filterTee)
			filteredRows = filteredRows.filter((r) =>
				r.tee.toLowerCase().includes(query.filterTee!.toLowerCase()),
			)
		if (query.filterFirstName)
			filteredRows = filteredRows.filter((r) =>
				r.firstName.toLowerCase().includes(query.filterFirstName!.toLowerCase()),
			)
		if (query.filterLastName)
			filteredRows = filteredRows.filter((r) =>
				r.lastName.toLowerCase().includes(query.filterLastName!.toLowerCase()),
			)
		if (query.filterEmail)
			filteredRows = filteredRows.filter((r) =>
				r.email.toLowerCase().includes(query.filterEmail!.toLowerCase()),
			)
		if (query.filterSignedUpBy)
			filteredRows = filteredRows.filter((r) =>
				r.signedUpBy.toLowerCase().includes(query.filterSignedUpBy!.toLowerCase()),
			)

		// Sort with default team ascending
		filteredRows.sort((a, b) => {
			let valA: string, valB: string
			if (effectiveSort === "age") {
				valA = a.age === "n/a" ? (effectiveDir === "asc" ? "999" : "000") : a.age
				valB = b.age === "n/a" ? (effectiveDir === "asc" ? "999" : "000") : b.age
				return effectiveDir === "desc"
					? parseInt(valB) - parseInt(valA)
					: parseInt(valA) - parseInt(valB)
			} else {
				const sortKey: keyof EventReportRowDto =
					effectiveSort === "team"
						? "teamId"
						: effectiveSort === "fullName"
							? "fullName"
							: (effectiveSort as "ghin")
				valA = a[sortKey] || ""
				valB = b[sortKey] || ""
				if (effectiveDir === "desc") return valB.localeCompare(valA)
				return valA.localeCompare(valB)
			}
		})

		return filteredRows
	}

	async getPointsReport(eventId: number): Promise<PointsReport> {
		// Stub: Mock points
		return await Promise.resolve({
			eventId,
			points: [
				{ playerId: 1, points: 100 },
				{ playerId: 2, points: 95 },
			],
		})
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

import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common"
import {
	EventDto,
	EventPlayerFeeDto,
	EventPlayerSlotDto,
	EventRegistrationSummaryDto,
} from "@repo/dto"

import { HoleDto } from "../courses"
import { CoursesService } from "../courses/courses.service"
import { RegisteredPlayerDto } from "../registration"
import { toPlayerDomain } from "../registration/domain/mappers"
import { getAge, getFullName } from "../registration/domain/player.domain"
import { RegistrationService } from "../registration/registration.service"
import { getStart } from "./domain/event.domain"
import { getGroup } from "./domain/group.domain"
import { toEventDomain, toHoleDomain, toSlotDomain } from "./domain/mappers"
import { EventFeeWithTypeDto } from "./dto/event-fee.dto"
import { EventsService } from "./events.service"

@Controller("events")
export class EventsController {
	constructor(
		private readonly events: EventsService,
		private readonly registration: RegistrationService,
		private readonly courses: CoursesService,
	) {}

	@Get(":eventId/players")
	async getPlayersByEvent(
		@Param("eventId", ParseIntPipe) eventId: number,
	): Promise<EventRegistrationSummaryDto> {
		const event = await this.events.findEventById(eventId)
		const eventFees = await this.events.listEventFeesByEvent(eventId)
		const slots = await this.registration.getRegisteredPlayers(eventId)

		if (!slots || slots.length === 0) return { eventId, total: 0, slots: [] }

		// Validate event
		if (!event) throw new Error(`Event ${eventId} not found`)

		// convert event to domain model
		const eventDomain = toEventDomain(event)

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
			if (eventDomain.canChoose) {
				if (!course) throw new Error(`Missing course for slot id ${slot?.id}`)
				courseName = course.name
				holes = holesMap.get(course.id!) ?? []
			}
			// convert holes to domain model array when used

			const slotDomain = toSlotDomain(slot)
			const holesDomain = holes.map(toHoleDomain)
			const startValue = getStart(eventDomain, slotDomain, holesDomain)
			const allSlotsInRegistration = (regGroups.get(registration.id!) ?? []).map(
				(x: RegisteredPlayerDto) => toSlotDomain(x.slot),
			)

			const team = getGroup(eventDomain, slotDomain, startValue, courseName, allSlotsInRegistration)

			const playerDomain = toPlayerDomain(player)
			const ageRes = getAge(playerDomain, new Date())
			const age = typeof ageRes.age === "number" ? ageRes.age : 0

			const fullName = getFullName(playerDomain)

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
				fees,
			}
		})

		// Sort by team column (alpha-numeric)
		transformed.sort((a, b) => {
			const teamA = String(a.team ?? "")
			const teamB = String(b.team ?? "")
			return teamA.localeCompare(teamB, undefined, { numeric: true })
		})

		return { eventId, total: transformed.length, slots: transformed }
	}

	@Get("search")
	async searchEventsByDate(@Query("date") date: string): Promise<EventDto[]> {
		if (!date) {
			throw new Error("Date query parameter is required")
		}
		return this.events.findEventsByDate(date)
	}
}

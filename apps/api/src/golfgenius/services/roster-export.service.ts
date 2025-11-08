import { Injectable, Logger } from "@nestjs/common"

import { CoursesService } from "../../courses/courses.service"
import { CourseDto } from "../../courses/dto/course.dto"
import { HoleDto } from "../../courses/dto/hole.dto"
import { getStart } from "../../events/domain/event.domain"
import { getGroup } from "../../events/domain/group.domain"
import { toHoleDomain, toSlotDomain } from "../../events/domain/mappers"
import { EventDto } from "../../events/dto/event.dto"
import { RoundDto } from "../../events/dto/round.dto"
import { EventsService } from "../../events/events.service"
import { PlayerDto } from "../../registration/dto/player.dto"
import {
	EventFeeDto,
	FeeTypeDto,
	RegisteredPlayerDto,
} from "../../registration/dto/registered-player.dto"
import { RegistrationSlotDto } from "../../registration/dto/registration-slot.dto"
import { RegistrationDto } from "../../registration/dto/registration.dto"
import { RegistrationService } from "../../registration/registration.service"
import { ApiClient } from "../api-client"
import { RosterMemberDto, RosterMemberSyncDto } from "../dto/internal.dto"

type ExportError = { slotId?: number; playerId?: number; email?: string; error: string }

interface FeeDefinition {
	eventFee?: EventFeeDto
	feeType: FeeTypeDto
	name: string
}

interface GgMemberResponse {
	member_id_str?: string
	[key: string]: unknown
}

@Injectable()
export class RosterExportService {
	private readonly logger = new Logger(RosterExportService.name)

	constructor(
		private readonly events: EventsService,
		private readonly registration: RegistrationService,
		private readonly courses: CoursesService,
		private readonly apiClient: ApiClient,
	) {}

	// ---------- Helpers for master roster sync (original functionality) ----------

	private normalizeGhin(ghin?: string | null) {
		if (!ghin) return null
		const trimmed = String(ghin).trim()
		// strip leading zeros for comparison and also keep a padded version
		return trimmed.replace(/^0+/, "") || "0"
	}

	/**
	 * Process a single player registration slot and return the result
	 */
	private async processSinglePlayer(
		slot: RegistrationSlotDto,
		player: PlayerDto | undefined,
		registration: RegistrationDto | undefined,
		course: CourseDto | undefined,
		event: EventDto,
		rounds: RoundDto[],
		holesMap: Map<number, HoleDto[]>,
		feeDefinitions: FeeDefinition[],
		allSlots: RegisteredPlayerDto[],
		rosterByGhin: Map<string, RosterMemberDto>,
		rosterBySlotId: Map<number, RosterMemberDto>,
	): Promise<{
		success: boolean
		action: "created" | "skipped" | "error"
		error?: ExportError
	}> {
		try {
			if (!player) {
				return {
					success: false,
					action: "error",
					error: { slotId: slot?.id, error: "Missing player data" },
				}
			}
			if (!registration) {
				return {
					success: false,
					action: "error",
					error: { slotId: slot?.id, error: "Missing registration data" },
				}
			}
			if (!slot) {
				return {
					success: false,
					action: "error",
					error: { slotId: 0, error: "Missing registration slot data" },
				}
			}

			// Determine course name
			let courseName = "N/A"
			let holes: HoleDto[] = []
			if (event.canChoose) {
				if (!course) {
					return {
						success: false,
						action: "error",
						error: {
							slotId: slot?.id,
							playerId: player?.id,
							email: player?.email,
							error: "Missing course for slot",
						},
					}
				}
				courseName = course.name
				holes = course.id ? (holesMap.get(course.id) ?? []) : []
			}

			const slotDomain = toSlotDomain(slot)
			const holesDomain = (holes ?? []).map(toHoleDomain)
			const startValue = getStart(event, slotDomain, holesDomain)
			const allSlotsInRegistration = (
				allSlots.filter((x) => x.registration?.id === registration.id) ?? []
			).map((x) => toSlotDomain(x.slot))
			const team = getGroup(event, slotDomain, startValue, courseName, allSlotsInRegistration)

			// build custom fields as an array with a single map (GG accepts any key-value)
			const customFields: Record<string, string | null> = {
				team: team ?? null,
				course: courseName ?? null,
				start: startValue ?? null,
				ghin: player.ghin ?? null,
				tee: player.tee ?? null,
				signed_up_by: registration.signedUpBy ?? null,
				player_id: player.id?.toString?.() ?? String(player.id ?? ""),
				registration_slot_id: slot.id?.toString?.() ?? String(slot.id ?? ""),
			}

			// dynamic skins fee columns
			for (const fd of feeDefinitions) {
				const fee = (allSlots.find((s) => s.slot?.id === slot.id)?.fees ?? []).find(
					(f) => f.eventFee?.id === fd.eventFee?.id,
				)
				const paid = fee?.isPaid === 1
				const amount = paid ? String(fee?.amount ?? 0) : "0"
				customFields[fd.name] = amount
			}

			const roundsGgIds = rounds?.map((r) => r.ggId?.toString()).filter(Boolean)

			const member: RosterMemberSyncDto = {
				externalId: slot.id!,
				lastName: player.lastName,
				firstName: player.firstName,
				email: player.email,
				gender: "M",
				handicapNetworkId: player.ghin,
				rounds: roundsGgIds ? (roundsGgIds as string[]) : [],
				customFields: customFields,
			}

			// Idempotency: match by slot id first, fallback to ghin
			let existing: RosterMemberDto | null | undefined
			existing = rosterBySlotId.get(slot.id!)

			if (!existing) {
				const playerGhinRaw = player.ghin ?? null
				const playerGhin = this.normalizeGhin(playerGhinRaw)
				if (playerGhin) {
					existing = rosterByGhin.get(playerGhin)
				}
			}

			if (!existing) {
				// CREATE
				this.logger.debug(`Did not find player: ${player.email}`)
				try {
					const res = await this.apiClient.createMemberRegistration(String(event.ggId), member)
					const memberId = this.extractMemberId(res)
					if (memberId) {
						await this.registration.updateRegistrationSlotGgId(slot.id!, String(memberId))
					}
					return { success: true, action: "created" }
				} catch (err: unknown) {
					this.logger.warn("Failed to create member", { slotId: slot.id, err: String(err) })
					return {
						success: false,
						action: "error",
						error: {
							slotId: slot.id,
							playerId: player.id,
							email: player.email,
							error: String(err),
						},
					}
				}
			} else {
				this.logger.debug(`Player ${player.email} has already been exported.`)
				return { success: true, action: "skipped" }
			}
		} catch (err: any) {
			this.logger.error("Unexpected error exporting slot", { err: String(err) })
			return {
				success: false,
				action: "error",
				error: { error: String(err) },
			}
		}
	}

	/**
	 * Aggregate batch results into the main result object
	 */
	private aggregateResults(
		result: {
			eventId: number
			totalPlayers: number
			created: number
			updated: number
			skipped: number
			errors: ExportError[]
		},
		batchResults: Array<{ success: boolean; action: string; error?: ExportError }>,
	) {
		for (const br of batchResults) {
			result.totalPlayers += 1
			if (br.success) {
				if (br.action === "created") result.created += 1
				else if (br.action === "updated") result.updated += 1
				else if (br.action === "skipped") result.skipped += 1
			} else {
				if (br.error) result.errors.push(br.error)
			}
		}
	}

	/**
	 * Export roster for an event to Golf Genius.
	 * Returns summary with counts and any errors encountered.
	 */
	async exportEventRoster(eventId: number) {
		const result = {
			eventId,
			totalPlayers: 0,
			created: 0,
			updated: 0,
			skipped: 0,
			errors: [] as ExportError[],
		}

		// 1. Validate event
		const event = await this.events.findEventById(eventId)
		if (!event) throw new Error(`Event ${eventId} not found`)
		// registration must be closed (signupEnd in past)
		// if (!event.signupEnd || new Date(event.signupEnd) > new Date()) {
		//     throw new Error(`Registration for event ${eventId} is not closed`)
		// }
		// must have GG id
		if (!event.ggId) {
			throw new Error(`Event ${eventId} does not have a Golf Genius ID (ggId)`)
		}

		// rounds & tournaments
		const rounds = await this.events.findRoundsByEventId(eventId)
		if (!rounds || rounds.length === 0) {
			throw new Error(`Event ${eventId} has no rounds`)
		}
		const roundGgIds = (rounds ?? []).map((r) => r.ggId).filter(Boolean)
		if (roundGgIds.length !== rounds.length) {
			throw new Error(`Not all rounds for event ${eventId} have Golf Genius IDs`)
		}

		const tournaments = await this.events.findTournamentsByEventId(eventId)
		if (!tournaments || tournaments.length === 0) {
			throw new Error(`Event ${eventId} has no tournaments`)
		}

		// 2. Get existing roster from GG for idempotency
		let existingRoster: RosterMemberDto[] = []
		try {
			existingRoster = await this.apiClient.getEventRoster(String(event.ggId))
		} catch (err: unknown) {
			this.logger.warn("Failed to fetch existing roster from Golf Genius", { err: String(err) })
			// proceed; we'll treat as empty roster and create entries
			existingRoster = []
		}

		const rosterByGhin = new Map<string, RosterMemberDto>()
		const rosterBySlotId = new Map<number, RosterMemberDto>()
		for (const mem of existingRoster) {
			// Prefer matching by GHIN (handicap_network_id) - normalize to strip leading zeros
			const rawGhin = mem?.ghin ?? null
			const normalized = this.normalizeGhin(rawGhin)
			if (normalized) rosterByGhin.set(normalized, mem)
			if (mem?.externalId) rosterBySlotId.set(+mem.externalId, mem)
		}

		// 3. Get all registration slots with relations
		const slots = await this.registration.getRegisteredPlayers(eventId)
		if (!slots || slots.length === 0) {
			return { ...result, totalPlayers: 0 }
		}

		// Collect course ids and fetch holes
		const courseIdSet = new Set<number>()
		for (const s of slots) {
			if (!s) continue
			const cid = s.course?.id ?? s.registration?.courseId
			if (cid !== null && cid !== undefined) courseIdSet.add(cid)
		}

		const holesMap = new Map<number, HoleDto[]>()
		await Promise.all(
			Array.from(courseIdSet).map(async (cid) => {
				try {
					const holes = await this.courses.findHolesByCourseId(cid)
					holesMap.set(cid, holes ?? [])
				} catch {
					holesMap.set(cid, [])
				}
			}),
		)

		// event fees (for skins dynamic columns)
		const eventFees = await this.events.listEventFeesByEvent(eventId)
		const feeDefinitions = (eventFees ?? [])
			.filter((f) => f.feeType.name.endsWith("Skins"))
			.map((ef) => {
				return {
					eventFee: ef.eventFee,
					feeType: ef.feeType,
					name: ef.feeType.name.toLowerCase().replace(" ", "_"),
				}
			})

		// 4. Process players in parallel batches
		const CONCURRENCY_LIMIT = 10 // Tune this based on API rate limits
		const playerTasks: Array<
			Promise<{
				success: boolean
				action: "created" | "updated" | "skipped" | "error"
				error?: ExportError
			}>
		> = []

		for (const s of slots) {
			if (!s) continue

			const task = this.processSinglePlayer(
				s.slot,
				s.player,
				s.registration,
				s.course,
				event,
				rounds,
				holesMap,
				feeDefinitions,
				slots,
				rosterByGhin,
				rosterBySlotId,
			)

			playerTasks.push(task)

			// Process in batches of CONCURRENCY_LIMIT
			if (playerTasks.length >= CONCURRENCY_LIMIT) {
				const batchResults = await Promise.all(playerTasks)
				this.aggregateResults(result, batchResults)
				playerTasks.length = 0 // Clear the batch
			}
		}

		// Process any remaining tasks
		if (playerTasks.length > 0) {
			const batchResults = await Promise.all(playerTasks)
			this.aggregateResults(result, batchResults)
		}

		return result
	}

	private extractMemberId(res: GgMemberResponse): string | null {
		if (!res) return null
		// Prefer the string form returned by Golf Genius to avoid JS integer overflow
		return res.member_id_str ?? null
	}

	private extractMemberIdFromRoster(rosterMember: RosterMemberDto): string | null {
		if (!rosterMember) return null
		// RosterMemberDto.id is the member ID
		return rosterMember.id ?? null
	}
}

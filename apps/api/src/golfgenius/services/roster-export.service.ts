import { Injectable, Logger } from "@nestjs/common"

import { CoursesService } from "../../courses/courses.service"
import { HoleDto } from "../../courses/dto/hole.dto"
import { getStart } from "../../events/domain/event.domain"
import { getGroup } from "../../events/domain/group.domain"
import { toHoleDomain, toSlotDomain } from "../../events/domain/mappers"
import { EventsService } from "../../events/events.service"
import { RegistrationService } from "../../registration/registration.service"
import { ApiClient } from "../api-client"
import { RosterMemberDto, RosterMemberSyncDto } from "../dto/internal.dto"

type ExportError = { slotId?: number; playerId?: number; email?: string; error: string }

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
		const rosterByEmail = new Map<string, RosterMemberDto>()
		for (const mem of existingRoster) {
			// Prefer matching by GHIN (handicap_network_id) - normalize to strip leading zeros
			const rawGhin = mem?.ghin ?? null
			const normalized = this.normalizeGhin(rawGhin)
			if (normalized) rosterByGhin.set(normalized, mem)
			if (mem?.email) rosterByEmail.set((mem.email || "").toString().toLowerCase(), mem)
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

		// rounds gg ids (strings)
		const roundsGgIds = rounds?.map((r) => r.ggId?.toString()).filter(Boolean)

		// 4. Loop through registrations and export
		for (const s of slots) {
			if (!s) continue
			try {
				const slot = s.slot
				const player = s.player
				const registration = s.registration
				const course = s.course

				if (!player) {
					result.errors.push({ slotId: slot?.id, error: "Missing player data" })
					continue
				}
				if (!registration) {
					result.errors.push({ slotId: slot?.id, error: "Missing registration data" })
					continue
				}

				// Determine course name
				let courseName = "N/A"
				let holes: HoleDto[] = []
				if (event.canChoose) {
					if (!course) {
						result.errors.push({
							slotId: slot?.id,
							playerId: player?.id,
							email: player?.email,
							error: "Missing course for slot",
						})
						continue
					}
					courseName = course.name
					holes = holesMap.get(course.id!) ?? []
				}

				const slotDomain = toSlotDomain(slot)
				const holesDomain = (holes ?? []).map(toHoleDomain)
				const startValue = getStart(event as any, slotDomain, holesDomain)
				const allSlotsInRegistration = (
					slots.filter((x) => x.registration?.id === registration.id) ?? []
				).map((x) => toSlotDomain(x.slot))
				const team = getGroup(
					event as any,
					slotDomain,
					startValue,
					courseName,
					allSlotsInRegistration,
				)

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
					const fee = (s.fees ?? []).find((f) => f.eventFee?.id === fd.eventFee?.id)
					const paid = fee?.isPaid === 1
					const amount = paid ? fee?.amount : "0"
					customFields[fd.name] = amount
				}

				const member: RosterMemberSyncDto = {
					externalId: slot.id!,
					lastName: player.lastName,
					firstName: player.firstName,
					email: player.email,
					gender: "M",
					handicapNetworkId: player.ghin,
					rounds: roundsGgIds ? (roundGgIds as string[]) : [],
					customFields: customFields,
				}

				result.totalPlayers += 1

				// Idempotency: match by GHIN first (normalized), fallback to email
				const playerGhinRaw = player.ghin ?? null
				const playerGhin = this.normalizeGhin(playerGhinRaw)
				let existing: RosterMemberDto | null | undefined
				if (playerGhin) {
					existing = rosterByGhin.get(playerGhin)
				}
				if (!existing) {
					const emailKey = (player.email ?? "").toString().toLowerCase()
					existing = emailKey ? rosterByEmail.get(emailKey) : null
				}

				if (!existing) {
					// CREATE
					try {
						const res = await this.apiClient.createMemberRegistration(String(event.ggId), member)
						const memberId = this.extractMemberId(res)
						if (memberId) {
							await this.registration.updateRegistrationSlotGgId(slot.id!, String(memberId))
						}
						result.created += 1
					} catch (err: unknown) {
						this.logger.warn("Failed to create member", { slotId: slot.id, err: String(err) })
						result.errors.push({
							slotId: slot.id,
							playerId: player.id,
							email: player.email,
							error: String(err),
						})
					}
				} else {
					// Compare basic fields to decide update vs skip
					const same =
						((existing.firstName ?? "").toString() === (member.firstName ?? "").toString() &&
							(existing.lastName ?? "").toString() === (member.lastName ?? "").toString() &&
							(existing.ghin ?? "") == (member.handicapNetworkId ?? "")) ||
						((existing.firstName ?? "").toString() === "" &&
							(member.firstName ?? "").toString() === "")

					if (same) {
						// skip
						result.skipped += 1
						// still ensure local ggId is saved
						try {
							const memberId = this.extractMemberId(existing)
							if (memberId) {
								await this.registration.updateRegistrationSlotGgId(slot.id!, String(memberId))
							}
						} catch {
							// non-fatal
						}
					} else {
						// UPDATE
						try {
							const memberId = this.extractMemberId(existing)
							if (!memberId) {
								// fallback: attempt create if no id present
								const res = await this.apiClient.createMemberRegistration(
									String(event.ggId),
									member,
								)
								const newId = this.extractMemberId(res)
								if (newId)
									await this.registration.updateRegistrationSlotGgId(slot.id!, String(newId))
								result.created += 1
							} else {
								await this.apiClient.updateMemberRegistration(
									String(event.ggId),
									String(memberId),
									member,
								)
								await this.registration.updateRegistrationSlotGgId(slot.id!, String(memberId))
								result.updated += 1
							}
						} catch (err: any) {
							this.logger.warn("Failed to update member", { slotId: slot.id, err: String(err) })
							result.errors.push({
								slotId: slot.id,
								playerId: player.id,
								email: player.email,
								error: String(err),
							})
						}
					}
				}
			} catch (err: any) {
				this.logger.error("Unexpected error exporting slot", { err: String(err) })
				result.errors.push({ error: String(err) })
			}
		}

		return result
	}

	private extractMemberId(res: any): string | null {
		if (!res) return null
		// Prefer the string form returned by Golf Genius to avoid JS integer overflow
		return (res?.member_id_str as string | undefined) ?? null
	}
}

import { Subject } from "rxjs"

import {
	Injectable,
	Logger,
} from "@nestjs/common"
import { ProgressEventDto } from "@repo/dto"

import { CoursesService } from "../../courses/courses.service"
import { CourseDto } from "../../courses/dto/course.dto"
import { HoleDto } from "../../courses/dto/hole.dto"
import { getStart } from "../../events/domain/event.domain"
import { getGroup } from "../../events/domain/group.domain"
import {
	toHoleDomain,
	toSlotDomain,
} from "../../events/domain/mappers"
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
import {
	RosterMemberDto,
	RosterMemberSyncDto,
} from "../dto/internal.dto"
import { IntegrationLogService } from "./integration-log.service"

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

	private readonly activeExports = new Map<number, Subject<ProgressEventDto>>()
	private readonly exportResults = new Map<number, unknown>()

	constructor(
		private readonly events: EventsService,
		private readonly registration: RegistrationService,
		private readonly courses: CoursesService,
		private readonly apiClient: ApiClient,
		private readonly integrationLog: IntegrationLogService,
	) {}

	getProgressObservable(eventId: number): Subject<ProgressEventDto> | null {
		return this.activeExports.get(eventId) ?? null
	}

	setExportResult(eventId: number, result: unknown) {
		this.exportResults.set(eventId, result)

		// Auto-cleanup result after 10 minutes
		setTimeout(
			() => {
				this.exportResults.delete(eventId)
			},
			10 * 60 * 1000,
		)
	}

	getExportResult(eventId: number): unknown {
		return this.exportResults.get(eventId)
	}

	private emitProgress(eventId: number, progress: ProgressEventDto) {
		const subject = this.activeExports.get(eventId)
		if (subject) {
			subject.next(progress)
		}
	}

	private startExport(eventId: number, totalPlayers: number) {
		const subject = new Subject<ProgressEventDto>()
		this.activeExports.set(eventId, subject)

		// Auto-cleanup after 5 minutes
		setTimeout(
			() => {
				this.cleanupExport(eventId)
			},
			5 * 60 * 1000,
		)

		this.emitProgress(eventId, {
			totalPlayers,
			processedPlayers: 0,
			status: "processing",
			message: "Starting export...",
		})

		return subject
	}

	private completeExport(eventId: number, totalPlayers: number) {
		this.emitProgress(eventId, {
			totalPlayers,
			processedPlayers: totalPlayers,
			status: "complete",
			message: "Export complete",
		})

		// Log successful export completion
		const exportResult = this.getExportResult(eventId)
		this.integrationLog
			.createLogEntry({
				actionName: "Export Roster",
				actionDate: new Date().toISOString(),
				details: JSON.stringify(exportResult, null, 2),
				eventId,
				isSuccessful: true,
			})
			.catch((error: unknown) => {
				this.logger.error("Failed to log successful roster export", {
					eventId,
					error: String(error),
				})
			})

		// Cleanup after a short delay to allow final event to be sent
		setTimeout(() => {
			this.cleanupExport(eventId)
		}, 1000)
	}

	private errorExport(eventId: number, totalPlayers: number, error: string) {
		this.emitProgress(eventId, {
			totalPlayers,
			processedPlayers: 0,
			status: "error",
			message: error,
		})

		// Log failed export
		const exportResult = this.getExportResult(eventId)
		this.integrationLog
			.createLogEntry({
				actionName: "Export Roster",
				actionDate: new Date().toISOString(),
				details: JSON.stringify(
					{
						error,
						result: exportResult,
					},
					null,
					2,
				),
				eventId,
				isSuccessful: false,
			})
			.catch((logError: unknown) => {
				this.logger.error("Failed to log failed roster export", {
					eventId,
					logError: String(logError),
				})
			})

		// Cleanup after a short delay
		setTimeout(() => {
			this.cleanupExport(eventId)
		}, 1000)
	}

	private cleanupExport(eventId: number) {
		const subject = this.activeExports.get(eventId)
		if (subject) {
			subject.complete()
			this.activeExports.delete(eventId)
		}
	}

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
		action: "created" | "skipped" | "updated" | "error"
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
				this.logger.debug(`CREATE: Did not find player: ${player.email}`)
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
				this.logger.debug(`UPDATE: Player ${player.email} has already been exported.`)
				await this.apiClient.updateMemberRegistration(String(event.ggId), existing.id, member)
				return { success: true, action: "updated" }
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
	 * Returns the progress Subject immediately, then processes export asynchronously.
	 */
	exportEventRoster(eventId: number): Subject<ProgressEventDto> {
		const result = {
			eventId,
			totalPlayers: 0,
			created: 0,
			updated: 0,
			skipped: 0,
			errors: [] as ExportError[],
		}

		// Check if export is already running for this event
		if (this.activeExports.has(eventId)) {
			throw new Error(`Export already in progress for event ${eventId}`)
		}

		// Start progress tracking and return subject immediately
		const subject = this.startExport(eventId, 0) // We'll update totalPlayers later

		// Process export asynchronously
		this.processExportAsync(eventId, result).catch((error) => {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			this.logger.error(`Export failed for event ${eventId}:`, error)
			this.errorExport(eventId, result.totalPlayers || 0, errorMessage)
		})

		return subject
	}

	/**
	 * Process the export asynchronously after returning the Subject
	 */
	private async processExportAsync(
		eventId: number,
		result: {
			eventId: number
			totalPlayers: number
			created: number
			updated: number
			skipped: number
			errors: ExportError[]
		},
	) {
		try {
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
				this.setExportResult(eventId, { ...result, totalPlayers: 0 })
				this.completeExport(eventId, 0)
				return
			}

			// Update progress with actual player count
			this.emitProgress(eventId, {
				totalPlayers: slots.length,
				processedPlayers: 0,
				status: "processing",
				message: "Starting export...",
			})

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

					// Emit progress after each batch (throttled)
					this.emitProgress(eventId, {
						totalPlayers: slots.length,
						processedPlayers: result.totalPlayers,
						status: "processing",
						message: `Processed ${result.totalPlayers} players...`,
					})

					playerTasks.length = 0 // Clear the batch
				}
			}

			// Process any remaining tasks
			if (playerTasks.length > 0) {
				const batchResults = await Promise.all(playerTasks)
				this.aggregateResults(result, batchResults)

				// Final progress update
				this.emitProgress(eventId, {
					totalPlayers: slots.length,
					processedPlayers: result.totalPlayers,
					status: "processing",
					message: `Processed ${result.totalPlayers} players...`,
				})
			}

			// Complete the export
			this.setExportResult(eventId, result)
			this.completeExport(eventId, result.totalPlayers)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			this.logger.error(`Export failed for event ${eventId}:`, error)

			// Emit error progress
			this.errorExport(eventId, result.totalPlayers || 0, errorMessage)
			this.setExportResult(eventId, { error: errorMessage })
			throw error
		}
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

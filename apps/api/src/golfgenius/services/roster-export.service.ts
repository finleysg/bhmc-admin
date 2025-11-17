import { Subject } from "rxjs"

import { Injectable, Logger } from "@nestjs/common"
import {
	CourseDto,
	EventDto,
	EventFeeDto,
	HoleDto,
	PlayerDto,
	ProgressEventDto,
	RegistrationSlotDto,
} from "@repo/dto"

import { CoursesService } from "../../courses/courses.service"
import { RoundDto } from "../../events"
import { EventsService } from "../../events/events.service"
import { RegisteredPlayerDto, RegistrationDto } from "../../registration"
import { RegistrationService } from "../../registration/registration.service"
import { ApiClient } from "../api-client"
import { ExportError, ExportResult, TransformationContext } from "../dto"
import { RosterMemberDto } from "../dto/internal.dto"
import { ProgressTracker } from "./progress-tracker"
import { RosterPlayerTransformer } from "./roster-player-transformer"

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
		private readonly progressTracker: ProgressTracker,
		private readonly playerTransformer: RosterPlayerTransformer,
	) {}

	getProgressObservable(eventId: number): Subject<ProgressEventDto> | null {
		return this.progressTracker.getProgressObservable(eventId) as Subject<ProgressEventDto> | null
	}

	getExportResult(eventId: number): ExportResult | null {
		const result = this.progressTracker.getResult(eventId)
		return result && "totalPlayers" in result ? result : null
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
		eventFees: EventFeeDto[],
		allSlots: RegisteredPlayerDto[],
		rosterByGhin: Map<string, RosterMemberDto>,
		rosterBySlotId: Map<number, RosterMemberDto>,
	): Promise<{
		success: boolean
		action: "created" | "skipped" | "updated" | "error"
		error?: ExportError
	}> {
		try {
			// Input validation
			if (!player || !registration || !slot) {
				return {
					success: false,
					action: "error",
					error: {
						slotId: slot?.id || 0,
						playerId: player?.id,
						email: player?.email,
						error: !player
							? "Missing player data"
							: !registration
								? "Missing registration data"
								: "Missing registration slot data",
					},
				}
			}

			// Determine course and holes for transformation context
			let holes: HoleDto[] = []
			if (event.canChoose) {
				if (!course) {
					return {
						success: false,
						action: "error",
						error: {
							slotId: slot.id,
							playerId: player.id,
							email: player.email,
							error: "Missing course for slot when course choice is enabled",
						},
					}
				}
				holes = course.id ? (holesMap.get(course.id) ?? []) : []
			}

			// Create transformation context
			const context: TransformationContext = {
				event,
				rounds,
				course: event.canChoose ? course : undefined,
				holes,
				eventFees,
				allSlotsInRegistration: allSlots.filter((s) => s.registration?.id === registration.id),
			}

			// Validate transformation inputs
			const validation = this.playerTransformer.validateTransformationInputs(
				slot,
				player,
				registration,
				context,
			)
			if (!validation.isValid) {
				return {
					success: false,
					action: "error",
					error: {
						slotId: slot.id,
						playerId: player.id,
						email: player.email,
						error: validation.errors.join(", "),
					},
				}
			}

			// Transform player data using the dedicated transformer
			const member = this.playerTransformer.transformToGgMember(slot, player, registration, context)

			// Idempotency: match by slot id first, fallback to ghin
			let existing: RosterMemberDto | null | undefined
			existing = rosterBySlotId.get(slot.id)

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
						await this.registration.updateRegistrationSlotGgId(slot.id, String(memberId))
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
		result: ExportResult,
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
		const result: ExportResult = {
			eventId,
			totalPlayers: 0,
			created: 0,
			updated: 0,
			skipped: 0,
			errors: [],
		}

		// Start progress tracking and return subject immediately
		const subject = this.progressTracker.startTracking(eventId, 0) // We'll update totalPlayers later

		// Process export asynchronously
		this.processExportAsync(eventId, result).catch((error) => {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			this.logger.error(`Export failed for event ${eventId}:`, error)
			this.progressTracker.errorExport(eventId, errorMessage, result).catch(() => {})
		})

		return subject as Subject<ProgressEventDto>
	}

	/**
	 * Process the export asynchronously after returning the Subject
	 */
	private async processExportAsync(eventId: number, result: ExportResult) {
		try {
			// 1. Validate event
			const event = await this.events.findEventById({ eventId })
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
				this.progressTracker.setResult(eventId, { ...result, totalPlayers: 0 })
				await this.progressTracker.completeExport(eventId, { ...result, totalPlayers: 0 })
				return
			}

			// Update progress with actual player count
			this.progressTracker.emitProgress(eventId, {
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
					eventFees,
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
					this.progressTracker.emitProgress(eventId, {
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
				this.progressTracker.emitProgress(eventId, {
					totalPlayers: slots.length,
					processedPlayers: result.totalPlayers,
					status: "processing",
					message: `Processed ${result.totalPlayers} players...`,
				})
			}

			// Complete the export
			this.progressTracker.setResult(eventId, result)
			await this.progressTracker.completeExport(eventId, result)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			this.logger.error(`Export failed for event ${eventId}:`, error)

			// Emit error progress and set result
			await this.progressTracker.errorExport(eventId, errorMessage, result)
			throw error
		}
	}

	private extractMemberId(res: GgMemberResponse): string | null {
		if (!res) return null
		// Prefer the string form returned by Golf Genius to avoid JS integer overflow
		return res.member_id_str ?? null
	}

	// private extractMemberIdFromRoster(rosterMember: RosterMemberDto): string | null {
	// 	if (!rosterMember) return null
	// 	// RosterMemberDto.id is the member ID
	// 	return rosterMember.id ?? null
	// }
}

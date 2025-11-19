import { Subject } from "rxjs"

import { Injectable, Logger } from "@nestjs/common"
import { ClubEvent, Hole, ProgressEventDto, RegisteredPlayer } from "@repo/domain/types"

import { EventsService } from "../../events/events.service"
import { RegistrationService } from "../../registration/registration.service"
import { ApiClient } from "../api-client"
import { ExportError, ExportResult, TransformationContext, ValidRegisteredPlayer } from "../dto"
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
		registeredPlayer: RegisteredPlayer,
		clubEvent: ClubEvent,
		registeredPlayersGroup: RegisteredPlayer[],
		holesMap: Map<number, Hole[]>,
		rosterByGhin: Map<string, RosterMemberDto>,
		rosterBySlotId: Map<number, RosterMemberDto>,
	): Promise<{
		success: boolean
		action: "created" | "skipped" | "updated" | "error"
		error?: ExportError
	}> {
		try {
			// Determine course and holes for transformation context
			let holes: Hole[] = []
			if (clubEvent.canChoose) {
				holes = holesMap.get(registeredPlayer.course!.id!) ?? []
			}

			// Create transformation context
			const context: TransformationContext = {
				event: clubEvent,
				course: registeredPlayer.course,
				holes,
				group: registeredPlayersGroup.filter(
					(s) => s.registration?.id === registeredPlayer.registration!.id,
				),
			}

			// Validate transformation inputs
			const validation = this.playerTransformer.validateTransformationInputs(
				registeredPlayer,
				context,
			)
			if (!validation.isValid) {
				return {
					success: false,
					action: "error",
					error: {
						slotId: registeredPlayer.slot?.id,
						playerId: registeredPlayer.player?.id,
						email: registeredPlayer.player?.email,
						error: (validation.result as string[]).join(", "),
					},
				}
			}

			const validRegisteredPlayer = validation.result as ValidRegisteredPlayer
			const member = this.playerTransformer.transformToGgMember(validRegisteredPlayer, context)

			// Idempotency: match by slot id first, fallback to ghin
			let existing: RosterMemberDto | null | undefined
			existing = rosterBySlotId.get(validRegisteredPlayer.slot.id)

			if (!existing) {
				const playerGhinRaw = validRegisteredPlayer.player.ghin
				const playerGhin = this.normalizeGhin(playerGhinRaw)
				if (playerGhin) {
					existing = rosterByGhin.get(playerGhin)
				}
			}

			if (!existing) {
				this.logger.debug(`CREATE: Did not find player: ${validRegisteredPlayer.player.email}`)
				try {
					const res = await this.apiClient.createMemberRegistration(String(clubEvent.ggId), member)
					const memberId = this.extractMemberId(res)
					if (memberId) {
						await this.registration.updateRegistrationSlotGgId(
							validRegisteredPlayer.slot.id,
							String(memberId),
						)
					}
					return { success: true, action: "created" }
				} catch (err: unknown) {
					this.logger.warn("Failed to create member", {
						slotId: validRegisteredPlayer.slot.id,
						err: String(err),
					})
					return {
						success: false,
						action: "error",
						error: {
							slotId: validRegisteredPlayer.slot.id,
							playerId: validRegisteredPlayer.player.id,
							email: validRegisteredPlayer.player.email,
							error: String(err),
						},
					}
				}
			} else {
				this.logger.debug(
					`UPDATE: Player ${validRegisteredPlayer.player.email} has already been exported.`,
				)
				await this.apiClient.updateMemberRegistration(String(clubEvent.ggId), existing.id, member)
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
			// 1. Validation - TODO: add a domain function
			const event = await this.events.getCompleteClubEventById(eventId)

			if (!event) throw new Error(`ClubEvent ${eventId} not found`)
			if (!event.ggId) {
				throw new Error(`ClubEvent ${eventId} does not have a Golf Genius ID (ggId)`)
			}
			if (!event.eventRounds || event.eventRounds.length === 0) {
				throw new Error(`ClubEvent ${eventId} has no rounds`)
			}
			if (!event.tournaments || event.tournaments.length === 0) {
				throw new Error(`ClubEvent ${eventId} has no tournaments`)
			}

			// 2. Get existing roster from GG for idempotency
			let existingRoster: RosterMemberDto[] = []
			try {
				existingRoster = await this.apiClient.getEventRoster(String(event.ggId))
			} catch (err: unknown) {
				this.logger.warn("Failed to fetch existing roster from Golf Genius", { err: String(err) })
				existingRoster = []
			}

			const rosterByGhin = new Map<string, RosterMemberDto>()
			const rosterBySlotId = new Map<number, RosterMemberDto>()
			for (const mem of existingRoster) {
				const rawGhin = mem?.ghin ?? null
				const normalized = this.normalizeGhin(rawGhin)
				if (normalized) rosterByGhin.set(normalized, mem)
				if (mem?.externalId) rosterBySlotId.set(+mem.externalId, mem)
			}

			// 3. Get all registered players
			const registeredPlayers = await this.registration.getRegisteredPlayers(eventId)
			if (!registeredPlayers || registeredPlayers.length === 0) {
				this.progressTracker.setResult(eventId, { ...result, totalPlayers: 0 })
				await this.progressTracker.completeExport(eventId, { ...result, totalPlayers: 0 })
				return
			}

			// Update progress with actual player count
			this.progressTracker.emitProgress(eventId, {
				totalPlayers: registeredPlayers.length,
				processedPlayers: 0,
				status: "processing",
				message: "Starting export...",
			})

			// Holes map for convenience
			const holesMap = new Map<number, Hole[]>()
			event.courses?.map((course) => {
				holesMap.set(course.id!, course.holes ?? [])
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

			for (const reg of registeredPlayers) {
				if (!reg) continue

				const task = this.processSinglePlayer(
					reg,
					event,
					registeredPlayers,
					holesMap,
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
						totalPlayers: registeredPlayers.length,
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
					totalPlayers: registeredPlayers.length,
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

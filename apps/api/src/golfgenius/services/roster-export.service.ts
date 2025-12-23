import { Subject } from "rxjs"

import { Injectable, Logger } from "@nestjs/common"
import {
	PlayerProgressEvent,
	ValidatedClubEvent,
	ValidatedRegisteredPlayer,
} from "@repo/domain/types"

import { EventsService } from "../../events/events.service"
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
		private readonly apiClient: ApiClient,
		private readonly progressTracker: ProgressTracker,
		private readonly playerTransformer: RosterPlayerTransformer,
	) {}

	getProgressObservable(eventId: number): Subject<PlayerProgressEvent> | null {
		return this.progressTracker.getProgressObservable(
			eventId,
		) as Subject<PlayerProgressEvent> | null
	}

	getExportResult(eventId: number): ExportResult | null {
		const result = this.progressTracker.getResult(eventId)
		return result && "totalPlayers" in result ? result : null
	}

	// ---------- Helpers for master roster sync (original functionality) ----------
	// TODO: move to domain function
	private normalizeGhin(ghin?: string | null) {
		if (!ghin) return null
		const trimmed = String(ghin).trim()
		// strip leading zeros
		return trimmed.replace(/^0+/, "")
	}

	/**
	 * Process a single player registration slot and return the result
	 */
	private async processSinglePlayer(
		clubEvent: ValidatedClubEvent,
		registeredPlayer: ValidatedRegisteredPlayer,
		registeredPlayersGroup: ValidatedRegisteredPlayer[],
		rosterByGhin: Map<string, RosterMemberDto>,
		rosterBySlotId: Map<number, RosterMemberDto>,
	): Promise<{
		success: boolean
		action: "created" | "skipped" | "updated" | "error"
		error?: ExportError
	}> {
		try {
			// Create transformation context
			const context: TransformationContext = {
				event: clubEvent,
				group: registeredPlayersGroup.filter(
					(s) => s.registration?.id === registeredPlayer.registration.id,
				),
				course: registeredPlayer.course,
			}

			// Transform our registered player to the shape GG expects
			const member = this.playerTransformer.transformToGgMember(registeredPlayer, context)

			// Idempotency: match by slot id first, fallback to ghin
			let existing: RosterMemberDto | null | undefined
			existing = rosterBySlotId.get(registeredPlayer.slot.id)

			if (!existing) {
				const playerGhin = this.normalizeGhin(registeredPlayer.player.ghin)
				if (playerGhin) {
					existing = rosterByGhin.get(playerGhin)
				}
			}

			if (!existing) {
				this.logger.debug(`CREATE: Did not find player: ${registeredPlayer.player.email}`)
				const res = await this.apiClient.createMemberRegistration(clubEvent.ggId, member)
				const memberId = this.extractMemberId(res as GgMemberResponse)
				if (memberId) {
					await this.registration.updateRegistrationSlotGgId(
						registeredPlayer.slot.id,
						String(memberId),
					)
				}
				return { success: true, action: "created" }
			} else {
				this.logger.debug(
					`UPDATE: Player ${registeredPlayer.player.email} has already been exported.`,
				)
				await this.apiClient.updateMemberRegistration(clubEvent.ggId, existing.id, member)
				return { success: true, action: "updated" }
			}
		} catch (err: unknown) {
			this.logger.error("Failed to export registered player", { err: String(err) })
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
	exportEventRoster(eventId: number): Subject<PlayerProgressEvent> {
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

		return subject as Subject<PlayerProgressEvent>
	}

	/**
	 * Process the export asynchronously after returning the Subject
	 */
	private async processExportAsync(eventId: number, result: ExportResult) {
		try {
			// 1. Retrieve this club event
			const event = await this.events.getValidatedClubEventById(eventId)

			// 2. Get existing roster from GG for idempotency
			let existingRoster: RosterMemberDto[] = []
			try {
				existingRoster = await this.apiClient.getEventRoster(event.ggId)
			} catch (err: unknown) {
				this.logger.warn("Failed to fetch existing roster from Golf Genius", { err: String(err) })
				existingRoster = []
			}

			const rosterByGhin = new Map<string, RosterMemberDto>()
			const rosterBySlotId = new Map<number, RosterMemberDto>()
			for (const mem of existingRoster) {
				const rawGhin = mem.ghin ?? null
				const normalized = this.normalizeGhin(rawGhin)
				if (normalized) rosterByGhin.set(normalized, mem)
				if (mem.externalId) rosterBySlotId.set(+mem.externalId, mem)
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

			// 4. Process players in parallel batches
			const CONCURRENCY_LIMIT = 10 // Tune this based on API rate limits
			const playerTasks: Array<
				Promise<{
					success: boolean
					action: "created" | "updated" | "skipped" | "error"
					error?: ExportError
				}>
			> = []

			for (const registeredPlayer of registeredPlayers) {
				const task = this.processSinglePlayer(
					event,
					registeredPlayer,
					registeredPlayers,
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
}

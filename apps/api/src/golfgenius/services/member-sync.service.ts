import { Injectable, Logger } from "@nestjs/common"

import { RegistrationRepository, RegistrationService } from "../../registration"
import { ApiClient } from "../api-client"
import { MemberSyncResult } from "../dto"
import { MasterRosterItemDto } from "../dto/internal.dto"
import { ApiError, AuthError, RateLimitError } from "../errors"

@Injectable()
export class MemberSyncService {
	private readonly logger = new Logger(MemberSyncService.name)

	constructor(
		private readonly registration: RegistrationService,
		private readonly repository: RegistrationRepository,
		private readonly apiClient: ApiClient,
	) {}

	// ---------- Helpers for master roster sync (original functionality) ----------

	private normalizeGhin(ghin?: string | null) {
		if (!ghin) return null
		const trimmed = String(ghin).trim()
		// strip leading zeros for comparison and also keep a padded version
		return trimmed.replace(/^0+/, "") || "0"
	}

	// Build a map of handicap_network_id -> member_card_id from master roster
	private async buildMasterRosterMap(): Promise<Record<string, string>> {
		const map: Record<string, string> = {}
		let page = 1
		while (true) {
			const res = await this.apiClient.getMasterRoster(page)
			if (!res || !Array.isArray(res)) break
			for (const item of res) {
				// Support either mapped domain objects or raw API shapes
				const memberObj: any = item?.member ?? item
				const hn = memberObj?.handicapNetworkId ?? memberObj?.handicap?.handicap_network_id ?? null
				const mc = memberObj?.memberCardId ?? memberObj?.member_card_id ?? null
				if (hn && mc) {
					const key = this.normalizeGhin(hn)
					if (key) {
						map[key] = String(mc)
					}
				}
			}
			if (res.length < 100) break
			page += 1
		}
		return map
	}

	// Synchronize register_player.gg_id for players where is_member = true
	async syncMembersWithMasterRoster(): Promise<MemberSyncResult> {
		const result: MemberSyncResult = {
			total_players: 0,
			updated_players: 0,
			errors: [],
			unmatched: [],
		}

		// Load players from local DB
		const players = await this.repository.findMemberPlayers()
		result.total_players = players.length

		// Build master roster map
		let rosterMap: Record<string, string> = {}
		try {
			rosterMap = await this.buildMasterRosterMap()
		} catch (err: any) {
			if (err instanceof RateLimitError) {
				const msg = `Rate limited while loading master roster: retryAfter=${err.retryAfter}`
				this.logger.error(msg, { details: err.details })
				result.errors.push({ error: msg })
				return result
			}
			if (err instanceof AuthError) {
				const msg = `Authentication failed loading master roster: ${err.message}`
				this.logger.error(msg, { details: err.details })
				result.errors.push({ error: msg })
				return result
			}
			if (err instanceof ApiError) {
				const msg = `API error loading master roster: status=${err.status}`
				this.logger.error(msg, { status: err.status, response: err.response })
				result.errors.push({ error: msg })
				return result
			}
			const msg = `Failed to load master roster: ${String(err)}`
			this.logger.error(msg)
			result.errors.push({ error: msg })
			return result
		}

		for (const player of players) {
			try {
				const playerGhin = player.ghin ?? null
				const normalized = this.normalizeGhin(playerGhin)
				if (!normalized) {
					result.unmatched.push({
						id: player.id,
						name: `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim(),
						ghin: playerGhin,
					})
					continue
				}

				const memberCardId = rosterMap[normalized]
				if (!memberCardId) {
					result.unmatched.push({
						id: player.id,
						name: `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim(),
						ghin: playerGhin,
					})
					continue
				}

				// Update gg_id
				await this.registration.updatePlayerGgId(player.id!, memberCardId)
				result.updated_players += 1
			} catch (err) {
				const name = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim()
				const msg = `Failed to update player ${name || player.id}: ${String(err)}`
				this.logger.error(msg)
				result.errors.push({ error: msg })
			}
		}

		return result
	}

	// Sync a single player by id using master roster member lookup
	async syncPlayer(playerId: number) {
		const res: { updated?: boolean; message: string; player?: any } = { message: "" }

		// Find local player by id
		const player = await this.repository.findPlayerById(playerId)
		if (!player) {
			res.message = `No local register_player found with id ${playerId}`
			return res
		}

		// Fetch master roster member from GG
		let member: MasterRosterItemDto | null = null
		try {
			member = await this.apiClient.getMasterRosterMember(player.email)
		} catch (err: any) {
			if (err instanceof RateLimitError) {
				const msg = `Rate limited fetching master roster member for ${player.email}`
				this.logger.error(msg, { retryAfter: err.retryAfter })
				res.message = msg
				return res
			}
			const msg = `Failed to fetch master roster member for ${player.email}: ${String(err)}`
			this.logger.error(msg, { details: err?.details ?? err })
			res.message = msg
			return res
		}

		if (!member) {
			res.message = `No master roster member found for ${player.email}`
			return res
		}

		// Determine member_card_id and handicap network id from fetched member (support domain & raw shapes)
		const memberCardId = member.member?.memberCardId ?? null
		const hn = member?.member?.handicapNetworkId ?? null

		if (!memberCardId && !hn) {
			res.message = `Master roster member for ${player.email} missing member_card_id and handicap_network_id`
			return res
		}

		// If we have a member_card_id, use it to update gg_id
		try {
			let ggIdToSet = memberCardId ?? null

			// If gg id missing but we have hn, try to build the map and lookup
			if (!ggIdToSet && hn) {
				const key = this.normalizeGhin(hn)
				const rosterMap = await this.buildMasterRosterMap()
				ggIdToSet = rosterMap[key ?? ""]
			}

			if (!ggIdToSet) {
				res.message = `Could not determine member_card_id for ${player.email}`
				return res
			}

			const updated = await this.registration.updatePlayerGgId(player.id!, String(ggIdToSet))
			res.updated = true
			res.message = `Updated gg_id for ${player.email}`
			res.player = updated
			return res
		} catch (err) {
			const msg = `Failed to update local player for ${player.email}: ${String(err)}`
			this.logger.error(msg)
			res.message = msg
			return res
		}
	}
}

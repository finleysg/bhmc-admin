import { Injectable, Logger } from "@nestjs/common"
import { getPlayerStartName, getPlayerTeamName } from "@repo/domain/functions"
import { ValidatedRegisteredPlayer } from "@repo/domain/types"

import { RosterMemberSyncDto } from "../dto/internal.dto"
import { TransformationContext } from "../dto/roster.dto"

@Injectable()
export class RosterPlayerTransformer {
	private readonly logger = new Logger(RosterPlayerTransformer.name)

	/**
	 * Transform a player registration into a Golf Genius member sync DTO
	 */
	transformToGgMember(
		registeredPlayer: ValidatedRegisteredPlayer,
		context: TransformationContext,
	): RosterMemberSyncDto {
		const customFields = this.buildCustomFields(registeredPlayer, context)
		const roundsGgIds = context.event.eventRounds.map((r) => r.ggId.toString())

		return {
			externalId: registeredPlayer.slot.id,
			lastName: registeredPlayer.player.lastName,
			firstName: registeredPlayer.player.firstName,
			email: registeredPlayer.player.email,
			gender: "M",
			handicapNetworkId: registeredPlayer.player.ghin,
			rounds: roundsGgIds ?? [],
			customFields: customFields,
		}
	}

	/**
	 * Build custom fields object for Golf Genius member
	 */
	private buildCustomFields(
		registeredPlayer: ValidatedRegisteredPlayer,
		context: TransformationContext,
	): Record<string, string | null> {
		const { event, course, group } = context

		// Determine course name
		let courseName = "N/A"
		if (event.canChoose) {
			courseName = course!.name
		}

		// Calculate team and start using domain logic
		const startValue = getPlayerStartName(event, registeredPlayer)
		const team = getPlayerTeamName(
			event,
			registeredPlayer,
			group.flatMap((s) => (s.slot ? [s.slot] : [])),
		)

		// Base custom fields
		const customFields: Record<string, string | null> = {
			team,
			course: courseName,
			start: startValue,
			ghin: registeredPlayer.player.ghin ?? null,
			tee: registeredPlayer.player.tee,
			signed_up_by: registeredPlayer.registration.signedUpBy,
			player_id: registeredPlayer.player.id.toString(),
			registration_slot_id: registeredPlayer.slot.id.toString(),
		}

		// Add dynamic skins fee columns
		for (const fd of event.eventFees) {
			const fee = (group.find((s) => s.slot.id === registeredPlayer.slot.id)?.fees ?? []).find(
				(f) => f.eventFee?.id === fd.id,
			)
			const paid = fee?.isPaid
			const amount = paid ? String(fee?.amount ?? 0) : "0"
			customFields[fd.feeType.name] = amount
		}

		return customFields
	}
}

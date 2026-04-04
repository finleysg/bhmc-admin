import { Injectable, Logger } from "@nestjs/common"
import { getPlayerTeamName } from "@repo/domain/functions"
import { Course, CompleteClubEvent, RegisteredPlayer, FeeType } from "@repo/domain/types"
import { GgRegistrationData } from "../api-data"

export interface TransformationContext {
	event: CompleteClubEvent
	group: RegisteredPlayer[]
	course?: Course
}

@Injectable()
export class RosterPlayerTransformer {
	private readonly logger = new Logger(RosterPlayerTransformer.name)

	/**
	 * Transform a player registration into a Golf Genius member sync DTO
	 */
	transformToGgMember(
		registeredPlayer: RegisteredPlayer,
		context: TransformationContext,
	): GgRegistrationData {
		const customFields = this.buildCustomFields(registeredPlayer, context)
		const roundsGgIds = context.event.eventRounds.map((r) => r.ggId.toString())

		return {
			external_id: registeredPlayer.slot.id,
			last_name: registeredPlayer.player.lastName,
			first_name: registeredPlayer.player.firstName,
			email: registeredPlayer.player.email,
			gender: "M",
			handicap_network_id: registeredPlayer.player.ghin,
			rounds: roundsGgIds ?? [],
			custom_fields: customFields,
		}
	}

	/**
	 * Build custom fields object for Golf Genius member
	 */
	private buildCustomFields(
		registeredPlayer: RegisteredPlayer,
		context: TransformationContext,
	): Record<string, string | null> {
		const { event, course, group } = context

		// Determine course name
		let courseName = "N/A"
		if (event.canChoose) {
			courseName = course!.name
		}

		// Calculate team and start using domain logic
		const team = getPlayerTeamName(
			event,
			registeredPlayer,
			group.flatMap((s) => (s.slot ? [s.slot] : [])),
		)

		// Base custom fields
		const customFields: Record<string, string | null> = {
			team,
			course: courseName,
			tee: registeredPlayer.player.tee,
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
			const fieldName = this.normalizeFieldName(fd.feeType)
			customFields[fieldName] = amount
		}

		return customFields
	}

	private normalizeFieldName(feeType: FeeType): string {
		let feeName = "bhmc_" + feeType.name.toLowerCase().replace(" ", "_")

		// Remove special characters . & ( )
		feeName = feeName.replaceAll(/[.&()]/g, "")

		return feeName
	}
}

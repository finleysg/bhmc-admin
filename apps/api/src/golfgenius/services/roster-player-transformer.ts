import { Injectable, Logger } from "@nestjs/common"
import { getGroup, getStart } from "@repo/domain/functions"
import { RegisteredPlayer } from "@repo/domain/types"

import { RosterMemberSyncDto } from "../dto/internal.dto"
import { TransformationContext } from "../dto/roster.dto"

@Injectable()
export class RosterPlayerTransformer {
	private readonly logger = new Logger(RosterPlayerTransformer.name)

	/**
	 * Transform a player registration into a Golf Genius member sync DTO
	 */
	transformToGgMember(
		registeredPlayer: RegisteredPlayer,
		context: TransformationContext,
	): RosterMemberSyncDto {
		const customFields = this.buildCustomFields(registeredPlayer, context)
		const roundsGgIds = context.event.eventRounds!.map((r) => r.ggId!.toString())

		return {
			externalId: registeredPlayer.slot!.id!,
			lastName: registeredPlayer.player!.lastName,
			firstName: registeredPlayer.player!.firstName,
			email: registeredPlayer.player!.email,
			gender: "M",
			handicapNetworkId: registeredPlayer.player!.ghin,
			rounds: roundsGgIds,
			customFields: customFields,
		}
	}

	/**
	 * Build custom fields object for Golf Genius member
	 */
	private buildCustomFields(
		registeredPlayer: RegisteredPlayer,
		context: TransformationContext,
	): Record<string, string | null> {
		const { event, course, holes, group } = context

		// Determine course name
		let courseName = "N/A"
		if (event.canChoose) {
			courseName = course!.name
		}

		// Calculate team and start using domain logic
		const startValue = getStart(event, registeredPlayer.slot!, holes)
		const team = getGroup(
			event,
			registeredPlayer.slot!,
			startValue,
			courseName,
			group.map((s) => s.slot!),
		)

		// Base custom fields
		const customFields: Record<string, string | null> = {
			team,
			course: courseName,
			start: startValue,
			ghin: registeredPlayer.player!.ghin ?? null,
			tee: registeredPlayer.player!.tee ?? null,
			signed_up_by: registeredPlayer.registration!.signedUpBy,
			player_id: registeredPlayer.player!.id!.toString(),
			registration_slot_id: registeredPlayer.slot!.id!.toString(),
		}

		// Add dynamic skins fee columns
		for (const fd of event.eventFees!) {
			const fee = (group.find((s) => s.slot!.id === registeredPlayer.slot!.id)?.fees ?? []).find(
				(f) => f.eventFee!.id === fd.id,
			)
			const paid = fee?.isPaid
			const amount = paid ? String(fee?.amount ?? 0) : "0"
			customFields[fd.feeType!.name] = amount
		}

		return customFields
	}

	/**
	 * Validate transformation inputs
	 * TODO: once validated, we should work against a
	 * ValidRegisterPlayer model.
	 */
	validateTransformationInputs(
		registeredPlayer: RegisteredPlayer,
		context: TransformationContext,
	): { isValid: boolean; errors: string[] } {
		const errors: string[] = []

		if (!registeredPlayer.player) {
			errors.push("Missing player data")
		}

		if (!registeredPlayer.registration) {
			errors.push("Missing registration data")
		}

		if (!registeredPlayer.slot) {
			errors.push("Missing registration slot data")
		}

		if (context.event.canChoose && !context.course) {
			errors.push("Missing course for slot when course choice is enabled")
		}

		return {
			isValid: errors.length === 0,
			errors,
		}
	}
}

import { Injectable, Logger } from "@nestjs/common"
import { getGroup, getStart } from "@repo/domain/functions"
import {
	EventDto,
	EventFeeDto,
	FeeTypeDto,
	HoleDto,
	PlayerDto,
	RegistrationDto,
	RegistrationSlotDto,
} from "@repo/domain/types"

import { RegisteredPlayerDto } from "../../registration"
import { RosterMemberSyncDto } from "../dto/internal.dto"
import { FeeDefinition, TransformationContext } from "../dto/roster.dto"

@Injectable()
export class RosterPlayerTransformer {
	private readonly logger = new Logger(RosterPlayerTransformer.name)

	/**
	 * Transform a player registration into a Golf Genius member sync DTO
	 */
	transformToGgMember(
		slot: RegistrationSlotDto,
		player: PlayerDto,
		registration: RegistrationDto,
		context: TransformationContext,
	): RosterMemberSyncDto {
		const customFields = this.buildCustomFields(slot, player, registration, context)
		const roundsGgIds = context.rounds?.map((r) => r.ggId?.toString()).filter(Boolean)

		return {
			externalId: slot.id,
			lastName: player.lastName,
			firstName: player.firstName,
			email: player.email,
			gender: "M",
			handicapNetworkId: player.ghin,
			rounds: roundsGgIds ? (roundsGgIds as string[]) : [],
			customFields: customFields,
		}
	}

	/**
	 * Build custom fields object for Golf Genius member
	 */
	private buildCustomFields(
		slot: RegistrationSlotDto,
		player: PlayerDto,
		registration: RegistrationDto,
		context: TransformationContext,
	): Record<string, string | null> {
		const { event, course, holes, eventFees, allSlotsInRegistration } = context

		// Determine course name
		let courseName = "N/A"
		if (event.canChoose) {
			courseName = course?.name ?? "N/A"
		}

		// Calculate team and start using domain logic
		const startValue = getStart(event, slot, holes)
		const team = getGroup(
			event,
			slot,
			startValue,
			courseName,
			allSlotsInRegistration.map((s) => s.slot),
		)

		// Base custom fields
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

		// Add dynamic skins fee columns
		for (const fd of eventFees) {
			const fee = (allSlotsInRegistration.find((s) => s.slot?.id === slot.id)?.fees ?? []).find(
				(f) => f.eventFee?.id === fd.id,
			)
			const paid = fee?.isPaid === 1
			const amount = paid ? String(fee?.amount ?? 0) : "0"
			customFields[fd.feeType!.name] = amount
		}

		return customFields
	}

	/**
	 * Calculate team and start values for a player slot
	 */
	calculateTeamAndStart(
		slot: RegistrationSlotDto,
		event: EventDto,
		courseName: string,
		holes: HoleDto[],
		allSlotsInRegistration: RegisteredPlayerDto[],
	): { team: string | null; start: string | null } {
		const startValue = getStart(event, slot, holes)
		const team = getGroup(
			event,
			slot,
			startValue,
			courseName,
			allSlotsInRegistration.map((s) => s.slot),
		)

		return {
			team: team ?? null,
			start: startValue ?? null,
		}
	}

	/**
	 * Process fee definitions for skins columns
	 */
	processFeeDefinitions(
		eventFees: Array<{
			eventFee: EventFeeDto
			feeType: FeeTypeDto
		}>,
	): FeeDefinition[] {
		return eventFees
			.filter((f) => f.feeType.name.endsWith("Skins"))
			.map((ef) => ({
				eventFee: ef.eventFee,
				feeType: ef.feeType,
				name: ef.feeType.name.toLowerCase().replace(" ", "_"),
			})) as FeeDefinition[]
	}

	/**
	 * Validate transformation inputs
	 */
	validateTransformationInputs(
		slot: RegistrationSlotDto,
		player: PlayerDto,
		registration: RegistrationDto,
		context: TransformationContext,
	): { isValid: boolean; errors: string[] } {
		const errors: string[] = []

		if (!player) {
			errors.push("Missing player data")
		}

		if (!registration) {
			errors.push("Missing registration data")
		}

		if (!slot) {
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

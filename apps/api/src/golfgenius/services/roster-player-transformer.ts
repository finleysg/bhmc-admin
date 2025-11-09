import { Injectable, Logger } from "@nestjs/common"

import { HoleDto } from "../../courses/dto/hole.dto"
import { getStart } from "../../events/domain/event.domain"
import { getGroup } from "../../events/domain/group.domain"
import { toHoleDomain, toSlotDomain } from "../../events/domain/mappers"
import { EventDto } from "../../events/dto/event.dto"
import { PlayerDto } from "../../registration/dto/player.dto"
import {
	EventFeeDto,
	FeeTypeDto,
	RegisteredPlayerDto,
} from "../../registration/dto/registered-player.dto"
import { RegistrationSlotDto } from "../../registration/dto/registration-slot.dto"
import { RegistrationDto } from "../../registration/dto/registration.dto"
import { RosterMemberSyncDto } from "../dto/internal.dto"
import { FeeDefinition, TransformationContext } from "../dto/roster.dto"

@Injectable()
export class RosterPlayerTransformer {
	private readonly logger = new Logger(RosterPlayerTransformer.name)

	private normalizeGhin(ghin?: string | null): string | null {
		if (!ghin) return null
		const trimmed = String(ghin).trim()
		// strip leading zeros for comparison and also keep a padded version
		return trimmed.replace(/^0+/, "") || "0"
	}

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
			externalId: slot.id!,
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
		const { event, course, holes, feeDefinitions, allSlotsInRegistration } = context

		// Determine course name
		let courseName = "N/A"
		if (event.canChoose) {
			courseName = course?.name ?? "N/A"
		}

		// Calculate team and start using domain logic
		const slotDomain = toSlotDomain(slot)
		const holesDomain = holes.map(toHoleDomain)
		const startValue = getStart(event, slotDomain, holesDomain)
		const team = getGroup(
			event,
			slotDomain,
			startValue,
			courseName,
			allSlotsInRegistration.map((s) => toSlotDomain(s.slot)),
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
		for (const fd of feeDefinitions) {
			const fee = (allSlotsInRegistration.find((s) => s.slot?.id === slot.id)?.fees ?? []).find(
				(f) => f.eventFee?.id === fd.eventFee?.id,
			)
			const paid = fee?.isPaid === 1
			const amount = paid ? String(fee?.amount ?? 0) : "0"
			customFields[fd.name] = amount
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
		const slotDomain = toSlotDomain(slot)
		const holesDomain = holes.map(toHoleDomain)
		const startValue = getStart(event, slotDomain, holesDomain)
		const team = getGroup(
			event,
			slotDomain,
			startValue,
			courseName,
			allSlotsInRegistration.map((s) => toSlotDomain(s.slot)),
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

import { Injectable } from "@nestjs/common"
import { ClubEvent, RegistrationSlotWithPlayerAndWave, WaveInfo } from "@repo/domain/types"

import { EventsService } from "../../events"
import { RegistrationRepository } from "../repositories/registration.repository"
import { getCurrentWave, getStartingWave } from "../wave-calculator"
import { toPlayer, toRegistrationSlot } from "../mappers"
import { toHole } from "../../courses/mappers"

@Injectable()
export class RegistrationDataService {
	constructor(
		private readonly repository: RegistrationRepository,
		private readonly events: EventsService,
	) {}

	async getSlotsWithWaveInfo(
		eventId: number,
		event?: ClubEvent,
	): Promise<RegistrationSlotWithPlayerAndWave[]> {
		const resolvedEvent = event ?? (await this.events.getEventById(eventId))
		const rows = await this.repository.findRegistrationSlotsByEventId(eventId)

		return rows.map((row) => {
			const slot = toRegistrationSlot(row.slot)
			return {
				...slot,
				player: row.player ? toPlayer(row.player) : null,
				hole: row.hole ? toHole(row.hole) : undefined,
				wave: this.calculateWaveInfo(resolvedEvent, row.slot.startingOrder, row.hole?.holeNumber),
			}
		})
	}

	getCurrentWaveForEvent(event: ClubEvent): number {
		return getCurrentWave(event)
	}

	private calculateWaveInfo(
		event: ClubEvent,
		startingOrder: number,
		holeNumber?: number,
	): WaveInfo | undefined {
		if (!event.signupWaves || !event.prioritySignupStart || !event.signupStart) {
			return undefined
		}

		const slotWave = getStartingWave(event, startingOrder, holeNumber)
		const currentWave = getCurrentWave(event)

		const priorityStart = new Date(event.prioritySignupStart)
		const signupStart = new Date(event.signupStart)
		const waveDuration = (signupStart.getTime() - priorityStart.getTime()) / event.signupWaves
		const waveOpens = new Date(priorityStart.getTime() + (slotWave - 1) * waveDuration)

		return {
			wave: slotWave,
			isOpen: slotWave <= currentWave,
			opens: waveOpens.toISOString(),
		}
	}
}

import { eq } from "drizzle-orm"

import { Inject, Injectable, Logger } from "@nestjs/common"

import { DrizzleService, registrationFee, registrationSlot, toDbString } from "../../database"
import { ChangeLogRepository } from "../repositories/changelog.repository"
import { RegistrationRepository } from "../repositories/registration.repository"

interface ChangeLogEntry {
	eventId: number
	registrationId: number
	action: string
	actorId: number
	isAdmin: boolean
	details: Record<string, unknown>
}

@Injectable()
export class ChangeLogService {
	private readonly logger = new Logger(ChangeLogService.name)

	constructor(
		@Inject(ChangeLogRepository) private readonly repository: ChangeLogRepository,
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
		@Inject(RegistrationRepository) private readonly registrationRepo: RegistrationRepository,
	) {}

	async log(entry: ChangeLogEntry): Promise<void> {
		try {
			await this.repository.create({
				eventId: entry.eventId,
				registrationId: entry.registrationId,
				action: entry.action,
				actorId: entry.actorId,
				isAdmin: entry.isAdmin ? 1 : 0,
				details: entry.details,
				createdDate: toDbString(new Date()),
			})
		} catch (error) {
			this.logger.error(
				`Failed to write changelog entry: ${entry.action} for event ${entry.eventId}`,
				error,
			)
		}
	}

	async resolvePlayerNames(playerIds: number[]): Promise<string[]> {
		if (!playerIds.length) return []
		const players = await this.registrationRepo.findPlayersByIds(playerIds)
		return players.map((p) => `${p.firstName} ${p.lastName}`)
	}

	async resolveRegistrationIdFromSlotId(slotId: number): Promise<number | null> {
		const [slot] = await this.drizzle.db
			.select({ registrationId: registrationSlot.registrationId })
			.from(registrationSlot)
			.where(eq(registrationSlot.id, slotId))
			.limit(1)
		return slot?.registrationId ?? null
	}

	async resolveRegistrationIdFromFeeId(feeId: number): Promise<number | null> {
		const [fee] = await this.drizzle.db
			.select({ registrationSlotId: registrationFee.registrationSlotId })
			.from(registrationFee)
			.where(eq(registrationFee.id, feeId))
			.limit(1)
		if (!fee?.registrationSlotId) return null

		const [slot] = await this.drizzle.db
			.select({ registrationId: registrationSlot.registrationId })
			.from(registrationSlot)
			.where(eq(registrationSlot.id, fee.registrationSlotId))
			.limit(1)
		return slot?.registrationId ?? null
	}
}

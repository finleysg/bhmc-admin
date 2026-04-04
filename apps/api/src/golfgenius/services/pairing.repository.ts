import { eq } from "drizzle-orm"

import { Inject, Injectable } from "@nestjs/common"

import { DrizzleService, eventPairing, type EventPairingInsert } from "../../database"

@Injectable()
export class PairingRepository {
	constructor(@Inject(DrizzleService) private drizzle: DrizzleService) {}

	async insert(data: EventPairingInsert): Promise<void> {
		await this.drizzle.db.insert(eventPairing).values(data)
	}

	async deleteByEventId(eventId: number): Promise<void> {
		await this.drizzle.db.delete(eventPairing).where(eq(eventPairing.eventId, eventId))
	}
}

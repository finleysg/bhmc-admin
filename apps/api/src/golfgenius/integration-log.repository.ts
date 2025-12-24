import { and, eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import { DrizzleService } from "../database/drizzle.service"
import { integrationLog } from "../database/schema/golf-genius.schema"
import { IntegrationLogInsert, IntegrationLogRow } from "../database"

@Injectable()
export class IntegrationLogRepository {
	constructor(private readonly drizzle: DrizzleService) {}

	async createLogEntry(dto: IntegrationLogInsert): Promise<IntegrationLogRow> {
		const detailText = dto.details
			? typeof dto.details === "string"
				? dto.details
				: JSON.stringify(dto.details)
			: null

		try {
			const [result] = await this.drizzle.db.insert(integrationLog).values({
				actionName: dto.actionName,
				actionDate: new Date(dto.actionDate),
				details: detailText,
				eventId: dto.eventId,
				isSuccessful: dto.isSuccessful ? 1 : 0,
			})

			return this.findLogById(Number(result.insertId))
		} catch (error) {
			// TODO: real logging
			console.error("Full database error:", error)
			throw error
		}
	}

	async getLogsByEventId(eventId: number, actionName?: string): Promise<IntegrationLogRow[]> {
		const conditions = [eq(integrationLog.eventId, eventId)]

		if (actionName) {
			conditions.push(eq(integrationLog.actionName, actionName))
		}

		const logs = await this.drizzle.db
			.select()
			.from(integrationLog)
			.where(and(...conditions))
			.orderBy(integrationLog.actionDate)

		return logs
	}

	private async findLogById(id: number): Promise<IntegrationLogRow> {
		const [log] = await this.drizzle.db
			.select()
			.from(integrationLog)
			.where(eq(integrationLog.id, id))

		if (!log) {
			throw new Error(`Integration log with id ${id} not found`)
		}

		return log
	}
}

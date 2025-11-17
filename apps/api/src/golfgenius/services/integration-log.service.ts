import { and, eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"
import { IntegrationLogDto } from "@repo/domain"

import { DrizzleService } from "../../database/drizzle.service"
import { integrationLog } from "../../database/schema/golf-genius.schema"
import { CreateIntegrationLogDto } from "../dto/internal.dto"
import { mapToIntegrationLogDto } from "../dto/mappers"

@Injectable()
export class IntegrationLogService {
	constructor(private readonly drizzle: DrizzleService) {}

	async createLogEntry(dto: CreateIntegrationLogDto): Promise<IntegrationLogDto> {
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
			} as any)

			return this.findLogById(Number(result.insertId))
		} catch (error) {
			console.error("Full database error:", error)
			if (error instanceof Error) {
				console.error("Error message:", error.message)
				console.error("Error code:", (error as any).code)
				console.error("Error sqlMessage:", (error as any).sqlMessage)
			}
			throw error
		}
	}

	async getLogsByEventId(eventId: number, actionName?: string): Promise<IntegrationLogDto[]> {
		const conditions = [eq(integrationLog.eventId, eventId)]

		if (actionName) {
			conditions.push(eq(integrationLog.actionName, actionName))
		}

		const logs = await this.drizzle.db
			.select()
			.from(integrationLog)
			.where(and(...conditions))
			.orderBy(integrationLog.actionDate)

		return logs.map(mapToIntegrationLogDto)
	}

	private async findLogById(id: number): Promise<IntegrationLogDto> {
		const [log] = await this.drizzle.db
			.select()
			.from(integrationLog)
			.where(eq(integrationLog.id, id))

		if (!log) {
			throw new Error(`Integration log with id ${id} not found`)
		}

		return mapToIntegrationLogDto(log)
	}
}

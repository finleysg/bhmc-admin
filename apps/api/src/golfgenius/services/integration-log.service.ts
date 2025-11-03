import { eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import { DrizzleService } from "../../database/drizzle.service"
import { integrationLog } from "../../database/schema/golf-genius.schema"
import { CreateIntegrationLogDto, IntegrationLogDto } from "../dto/internal.dto"
import { mapToIntegrationLogDto } from "../dto/mappers"

@Injectable()
export class IntegrationLogService {
	constructor(private readonly drizzle: DrizzleService) {}

	async createLogEntry(dto: CreateIntegrationLogDto): Promise<IntegrationLogDto> {
		const [result] = await this.drizzle.db.insert(integrationLog).values({
			actionName: dto.actionName,
			actionDate: dto.actionDate,
			details: dto.details,
			eventId: dto.eventId,
			isSuccessful: dto.isSuccessful ? 1 : 0,
		} as any)

		return this.findLogById(Number(result.insertId))
	}

	async getLogsByEventId(eventId: number): Promise<IntegrationLogDto[]> {
		const logs = await this.drizzle.db
			.select()
			.from(integrationLog)
			.where(eq(integrationLog.eventId, eventId))
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

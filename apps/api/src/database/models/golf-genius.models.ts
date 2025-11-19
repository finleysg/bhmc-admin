import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"
import { createInsertSchema, createUpdateSchema } from "drizzle-zod"

import { integrationLog } from "../schema/golf-genius.schema"

export const integrationLogInsertSchema = createInsertSchema(integrationLog)
export const integrationLogUpdateSchema = createUpdateSchema(integrationLog)

// Integration Log Model
export class IntegrationLogModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsString()
	@MaxLength(20)
	actionName!: string

	@IsString()
	actionDate!: string // Datetime as string

	@IsOptional()
	@IsString()
	details?: string

	@IsInt()
	eventId!: number

	@IsNumber()
	@Min(0)
	@Max(1)
	isSuccessful!: number
}

import { Controller, Get } from "@nestjs/common"

import { hole } from "../database"
import { DrizzleService } from "../database/drizzle.service"

@Controller()
export class HealthController {
	constructor(private readonly drizzleService: DrizzleService) {}

	@Get("health")
	health() {
		return { status: "ok" }
	}

	@Get("health/db")
	async dbHealth() {
		try {
			await this.drizzleService.db.select().from(hole).limit(1)
			return { status: "ok", database: "connected" }
		} catch (error) {
			console.log(error)
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			return { status: "error", database: "disconnected", error: errorMessage }
		}
	}
}

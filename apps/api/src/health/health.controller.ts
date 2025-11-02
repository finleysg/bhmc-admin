import { Controller, Get } from "@nestjs/common"

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
			// Simple query to test database connectivity
			await this.drizzleService.db.execute("SELECT 1")
			return { status: "ok", database: "connected" }
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			return { status: "error", database: "disconnected", error: errorMessage }
		}
	}
}

import { Controller, Get, Inject } from "@nestjs/common"

import { Public } from "../auth"
import { hole } from "../database"
import { DrizzleService } from "../database/drizzle.service"

@Controller()
export class HealthController {
	constructor(@Inject(DrizzleService) private readonly drizzleService: DrizzleService) {}

	@Public()
	@Get("health")
	health() {
		return { status: "ok" }
	}

	@Public()
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

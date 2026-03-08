import { Body, Controller, Inject, Logger, Param, ParseIntPipe, Post } from "@nestjs/common"
import type { AdminRegistration } from "@repo/domain/types"

import { Admin } from "../../auth"
import { AdminRegistrationService } from "../services/admin-registration.service"

@Controller("registration")
@Admin()
export class TestRegistrationController {
	private readonly logger = new Logger(TestRegistrationController.name)

	constructor(
		@Inject(AdminRegistrationService)
		private readonly adminRegistrationService: AdminRegistrationService,
	) {}

	@Post(":eventId/test-registration")
	async createTestRegistration(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Body() dto: AdminRegistration,
	) {
		if (process.env.NODE_ENV === "production") {
			throw new Error("Test registration endpoint is not available in production")
		}

		this.logger.log(`Test registration for user ${dto.userId} in event ${eventId}`)
		return this.adminRegistrationService.createTestRegistration(eventId, dto)
	}
}

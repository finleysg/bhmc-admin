import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"

import { AdminRegistrationService } from "../services/admin-registration.service"

@Injectable()
export class RegistrationCleanupCron {
	private readonly logger = new Logger(RegistrationCleanupCron.name)

	constructor(private readonly service: AdminRegistrationService) {}

	@Cron(CronExpression.EVERY_5_MINUTES)
	async handleCleanup(): Promise<void> {
		const count = await this.service.cleanUpExpired()
		if (count > 0) {
			this.logger.log(`Cleaned up ${count} expired registrations`)
		}
	}
}

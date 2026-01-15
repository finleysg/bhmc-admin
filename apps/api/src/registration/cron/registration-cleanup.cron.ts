import { Inject, Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"

import { CleanupService } from "../services/cleanup.service"

@Injectable()
export class RegistrationCleanupCron {
	private readonly logger = new Logger(RegistrationCleanupCron.name)

	constructor(@Inject(CleanupService) private readonly service: CleanupService) {}

	@Cron(CronExpression.EVERY_5_MINUTES)
	async handleCleanup(): Promise<void> {
		const count = await this.service.cleanUpExpired()
		if (count > 0) {
			this.logger.log(`Cleaned up ${count} expired registrations`)
		}
	}
}

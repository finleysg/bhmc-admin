import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"

import { RegistrationFlowService } from "../registration-flow.service"

@Injectable()
export class RegistrationCleanupCron {
	private readonly logger = new Logger(RegistrationCleanupCron.name)

	constructor(private readonly flowService: RegistrationFlowService) {}

	@Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
	async handleCleanup(): Promise<void> {
		const count = await this.flowService.cleanUpExpired()
		if (count > 0) {
			this.logger.log(`Cleaned up ${count} expired registrations`)
		}
	}
}

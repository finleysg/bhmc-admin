import { Inject, Injectable, Logger } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"

import { ALERT_TIME_ZONE, AlertsService } from "./alerts.service"

@Injectable()
export class AlertsCron {
	private readonly logger = new Logger(AlertsCron.name)

	constructor(@Inject(AlertsService) private readonly alerts: AlertsService) {}

	@Cron("0 7 * * *", { timeZone: ALERT_TIME_ZONE })
	async sendDailyDigests(): Promise<void> {
		const { sent, failed } = await this.alerts.run(new Date())
		if (sent || failed) this.logger.log(`Alert digests: ${sent} sent, ${failed} failed`)
	}
}

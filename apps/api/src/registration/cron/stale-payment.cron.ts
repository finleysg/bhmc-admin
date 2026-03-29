import { Inject, Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"

import { StalePaymentService } from "../services/stale-payment.service"

@Injectable()
export class StalePaymentCron {
	private readonly logger = new Logger(StalePaymentCron.name)

	constructor(@Inject(StalePaymentService) private readonly service: StalePaymentService) {}

	@Cron(CronExpression.EVERY_HOUR)
	async handleStalePayments(): Promise<void> {
		const count = await this.service.notifyStalePayments()
		if (count > 0) {
			this.logger.log(`Sent ${count} failed payment notification(s)`)
		}
	}
}

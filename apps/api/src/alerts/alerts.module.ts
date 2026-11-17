import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { MailModule } from "../mail/mail.module"
import { ReadinessAlertSource, ReadinessModule } from "../readiness"

import { AlertRecipientsRepository } from "./alert-recipients.repository"
import { AlertsController } from "./alerts.controller"
import { AlertsCron } from "./alerts.cron"
import { AlertsService } from "./alerts.service"
import { ALERT_SOURCES, type AlertSource } from "./alerts.types"

@Module({
	imports: [DatabaseModule, MailModule, ReadinessModule],
	controllers: [AlertsController],
	providers: [
		AlertRecipientsRepository,
		AlertsService,
		AlertsCron,
		// Each alert source is added to this list.
		{
			provide: ALERT_SOURCES,
			useFactory: (readiness: ReadinessAlertSource): AlertSource[] => [readiness],
			inject: [ReadinessAlertSource],
		},
	],
	exports: [AlertsService],
})
export class AlertsModule {}

import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { MailModule } from "../mail/mail.module"

import { AlertRecipientsRepository } from "./alert-recipients.repository"
import { AlertsController } from "./alerts.controller"
import { AlertsCron } from "./alerts.cron"
import { AlertsService } from "./alerts.service"
import { ALERT_SOURCES, type AlertSource } from "./alerts.types"

@Module({
	imports: [DatabaseModule, MailModule],
	controllers: [AlertsController],
	providers: [
		AlertRecipientsRepository,
		AlertsService,
		AlertsCron,
		// Each alert source (readiness first, in slice 2) is added to this list.
		{ provide: ALERT_SOURCES, useValue: [] satisfies AlertSource[] },
	],
	exports: [AlertsService],
})
export class AlertsModule {}

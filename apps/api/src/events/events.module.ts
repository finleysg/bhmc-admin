import { Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { MailModule } from "../mail/mail.module"
import { PublicSiteModule } from "../public-site"
import { EventsController } from "./events.controller"
import { EventsRepository } from "./events.repository"
import { EventsService } from "./events.service"
import { SessionsController } from "./sessions.controller"
import {
	EventSetupController,
	EventSetupLookupsController,
	SeasonFeeChangeController,
	SeasonRollForwardController,
	SlotSetupController,
} from "./setup/event-setup.controller"
import { EventSetupRepository } from "./setup/event-setup.repository"
import { EventSetupService } from "./setup/event-setup.service"
import { SeasonFeeChangeService } from "./setup/season-fee-change.service"
import { SeasonRollForwardService } from "./setup/season-roll-forward.service"
import { SessionSetupService } from "./setup/session-setup.service"
import { SlotSetupRepository } from "./setup/slot-setup.repository"
import { SlotSetupService } from "./setup/slot-setup.service"

@Module({
	imports: [DatabaseModule, CoursesModule, MailModule, PublicSiteModule],
	controllers: [
		EventsController,
		SessionsController,
		EventSetupController,
		EventSetupLookupsController,
		SlotSetupController,
		SeasonRollForwardController,
		SeasonFeeChangeController,
	],
	providers: [
		EventsRepository,
		EventsService,
		EventSetupRepository,
		EventSetupService,
		SeasonFeeChangeService,
		SeasonRollForwardService,
		SessionSetupService,
		SlotSetupRepository,
		SlotSetupService,
	],
	exports: [EventsRepository, EventsService],
})
export class EventsModule {}

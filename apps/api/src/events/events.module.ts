import { Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { MailModule } from "../mail/mail.module"
import { EventsController } from "./events.controller"
import { EventsRepository } from "./events.repository"
import { EventsService } from "./events.service"
import { SessionsController } from "./sessions.controller"
import {
	EventSetupController,
	EventSetupLookupsController,
	SlotSetupController,
} from "./setup/event-setup.controller"
import { EventSetupRepository } from "./setup/event-setup.repository"
import { EventSetupService } from "./setup/event-setup.service"
import { SessionSetupService } from "./setup/session-setup.service"
import { SlotSetupRepository } from "./setup/slot-setup.repository"
import { SlotSetupService } from "./setup/slot-setup.service"

@Module({
	imports: [DatabaseModule, CoursesModule, MailModule],
	controllers: [
		EventsController,
		SessionsController,
		EventSetupController,
		EventSetupLookupsController,
		SlotSetupController,
	],
	providers: [
		EventsRepository,
		EventsService,
		EventSetupRepository,
		EventSetupService,
		SessionSetupService,
		SlotSetupRepository,
		SlotSetupService,
	],
	exports: [EventsRepository, EventsService],
})
export class EventsModule {}

import { Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { MailModule } from "../mail/mail.module"
import { EventsController } from "./events.controller"
import { EventsRepository } from "./events.repository"
import { EventsService } from "./events.service"
import { SessionsController } from "./sessions.controller"

@Module({
	imports: [DatabaseModule, CoursesModule, MailModule],
	controllers: [EventsController, SessionsController],
	providers: [EventsRepository, EventsService],
	exports: [EventsRepository, EventsService],
})
export class EventsModule {}

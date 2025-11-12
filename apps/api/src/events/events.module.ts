import { Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { RegistrationModule } from "../registration/registration.module"
import { EventsDomainService } from "./events-domain.service"
import { EventsController } from "./events.controller"
import { EventsService } from "./events.service"

@Module({
	imports: [DatabaseModule, RegistrationModule, CoursesModule],
	controllers: [EventsController],
	providers: [EventsService, EventsDomainService],
	exports: [EventsService, EventsDomainService],
})
export class EventsModule {}

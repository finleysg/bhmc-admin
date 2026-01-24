import { Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { RegistrationModule } from "../registration/registration.module"
import { EventsController } from "./events.controller"
import { EventsRepository } from "./events.repository"
import { EventsService } from "./events.service"

@Module({
	imports: [DatabaseModule, CoursesModule, RegistrationModule],
	controllers: [EventsController],
	providers: [EventsRepository, EventsService],
	exports: [EventsRepository, EventsService],
})
export class EventsModule {}

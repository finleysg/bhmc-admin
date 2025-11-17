import { Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { EventsModule } from "../events/events.module"
import { RegistrationService } from "./"
import { RegistrationController } from "./registration.controller"

@Module({
	imports: [CoursesModule, DatabaseModule, EventsModule],
	controllers: [RegistrationController],
	providers: [RegistrationService],
	exports: [RegistrationService],
})
export class RegistrationModule {}

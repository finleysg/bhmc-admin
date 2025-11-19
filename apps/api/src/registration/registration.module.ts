import { Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { EventsModule } from "../events/events.module"
import { RegistrationRepository, RegistrationService } from "./"
import { RegistrationController } from "./registration.controller"

@Module({
	imports: [CoursesModule, DatabaseModule, EventsModule],
	controllers: [RegistrationController],
	providers: [RegistrationRepository, RegistrationService],
	exports: [RegistrationRepository, RegistrationService],
})
export class RegistrationModule {}

import { Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { EventsModule } from "../events/events.module"
import { RegistrationModule } from "../registration/registration.module"
import { MemberReportsController } from "./member-reports.controller"
import { MemberScoresService } from "./member-scores.service"
import { ReportsController } from "./reports.controller"
import { ReportsService } from "./reports.service"

@Module({
	imports: [CoursesModule, DatabaseModule, EventsModule, RegistrationModule],
	controllers: [ReportsController, MemberReportsController],
	providers: [ReportsService, MemberScoresService],
	exports: [ReportsService],
})
export class ReportsModule {}

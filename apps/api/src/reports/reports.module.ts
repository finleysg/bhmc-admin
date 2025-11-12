import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { EventsModule } from "../events/events.module"
import { ReportsController } from "./reports.controller"
import { ReportsService } from "./reports.service"

@Module({
	imports: [DatabaseModule, EventsModule],
	controllers: [ReportsController],
	providers: [ReportsService],
	exports: [ReportsService],
})
export class ReportsModule {}

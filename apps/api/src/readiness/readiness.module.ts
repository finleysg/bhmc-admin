import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { SettingsModule } from "../settings"

import { ReadinessAlertSource } from "./readiness-alert.source"
import { ReadinessController } from "./readiness.controller"
import { ReadinessRepository } from "./readiness.repository"
import { ReadinessService } from "./readiness.service"

@Module({
	imports: [DatabaseModule, SettingsModule],
	controllers: [ReadinessController],
	providers: [ReadinessRepository, ReadinessService, ReadinessAlertSource],
	exports: [ReadinessService, ReadinessAlertSource],
})
export class ReadinessModule {}

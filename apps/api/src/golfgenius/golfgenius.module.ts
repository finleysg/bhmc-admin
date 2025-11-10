import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { EventsModule } from "../events/events.module"
import { RegistrationModule } from "../registration/registration.module"
import { ScoresModule } from "../scores/scores.module"
import { ApiClient } from "./api-client"
import golfGeniusConfig from "./config/golf-genius.config"
import { validationSchema } from "./config/validation.schema"
import { GolfgeniusController } from "./golfgenius.controller"
import { EventSyncService } from "./services/event-sync.service"
import { IntegrationLogService } from "./services/integration-log.service"
import { MemberSyncService } from "./services/member-sync.service"
import { PointsImportService } from "./services/points-import.service"
import { ProgressTracker } from "./services/progress-tracker"
import { ResultsImportService } from "./services/results-import.service"
import { RosterExportService } from "./services/roster-export.service"
import { RosterPlayerTransformer } from "./services/roster-player-transformer"
import { ScoresImportService } from "./services/scores-import.service"

@Module({
	imports: [
		ConfigModule.forRoot({
			load: [golfGeniusConfig],
			validationSchema,
		}),
		DatabaseModule,
		RegistrationModule,
		EventsModule,
		CoursesModule,
		ScoresModule,
	],
	controllers: [GolfgeniusController],
	providers: [
		ApiClient,
		EventSyncService,
		IntegrationLogService,
		PointsImportService,
		ProgressTracker,
		MemberSyncService,
		ResultsImportService,
		RosterExportService,
		RosterPlayerTransformer,
		ScoresImportService,
	],
})
export class GolfgeniusModule {}

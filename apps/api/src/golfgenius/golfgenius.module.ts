import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"

import { CoreModule } from "../core/core.module"
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
import { ImportAllResultsService } from "./services/import-all-results.service"
import { ImportChampionsService } from "./services/import-champions.service"
import { IntegrationLogRepository } from "./integration-log.repository"
import { LowScoresImportService } from "./services/low-scores-import.service"
import { MemberSyncService } from "./services/member-sync.service"
import { PointsImportService } from "./services/points-import.service"
import { ProgressTracker } from "./services/progress-tracker"
import { RosterExportService } from "./services/roster-export.service"
import { RosterPlayerTransformer } from "./services/roster-player-transformer"
import { ScoresImportService } from "./services/scores-import.service"

@Module({
	imports: [
		ConfigModule.forRoot({
			load: [golfGeniusConfig],
			validationSchema,
			isGlobal: true,
		}),
		DatabaseModule,
		RegistrationModule,
		EventsModule,
		CoreModule,
		CoursesModule,
		ScoresModule,
	],
	controllers: [GolfgeniusController],
	providers: [
		ApiClient,
		EventSyncService,
		IntegrationLogRepository,
		LowScoresImportService,
		PointsImportService,
		ProgressTracker,
		MemberSyncService,
		RosterExportService,
		RosterPlayerTransformer,
		ScoresImportService,
		ImportAllResultsService,
		ImportChampionsService,
	],
})
export class GolfgeniusModule {}

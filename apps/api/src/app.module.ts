import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"

import { JwtAuthGuard } from "./auth/jwt.guard"
import { DatabaseModule } from "./database/database.module"
import { EventsModule } from "./events/events.module"
import { GolfgeniusModule } from "./golfgenius/golfgenius.module"
import { HealthModule } from "./health/health.module"

@Module({
	imports: [DatabaseModule, EventsModule, GolfgeniusModule, HealthModule],
	providers: [
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
		},
	],
})
export class AppModule {}

import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"

import { JwtAuthGuard } from "./auth/jwt.guard"
import { DatabaseModule } from "./database/database.module"
import { EventsModule } from "./events/events.module"
import { HealthModule } from "./health/health.module"

@Module({
	imports: [DatabaseModule, EventsModule, HealthModule],
	providers: [
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
		},
	],
})
export class AppModule {}

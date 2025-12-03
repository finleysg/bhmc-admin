import { Module } from "@nestjs/common"
import { APP_FILTER, APP_GUARD } from "@nestjs/core"

import { JwtAuthGuard } from "./auth/jwt.guard"
import { CoreModule } from "./core/core.module"
import { DatabaseExceptionFilter } from "./database/database-exception.filter"
import { DatabaseModule } from "./database/database.module"
import { EventsModule } from "./events/events.module"
import { GolfgeniusModule } from "./golfgenius/golfgenius.module"
import { HealthModule } from "./health/health.module"
import { MailModule } from "./mail/mail.module"
import { ReportsModule } from "./reports/reports.module"
import { StripeModule } from "./stripe/stripe.module"

@Module({
	imports: [
		CoreModule,
		DatabaseModule,
		EventsModule,
		GolfgeniusModule,
		HealthModule,
		MailModule,
		ReportsModule,
		StripeModule,
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
		},
		{
			provide: APP_FILTER,
			useClass: DatabaseExceptionFilter,
		},
	],
})
export class AppModule {}

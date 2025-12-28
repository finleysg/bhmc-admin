import { Module } from "@nestjs/common"
import { APP_FILTER, APP_GUARD } from "@nestjs/core"
import { ScheduleModule } from "@nestjs/schedule"

import { JwtAuthGuard } from "./auth/jwt.guard"
import { CoreModule } from "./core/core.module"
import { DatabaseExceptionFilter } from "./database/database-exception.filter"
import { DatabaseModule } from "./database/database.module"
import { EventsModule } from "./events/events.module"
import { GolfgeniusModule } from "./golfgenius/golfgenius.module"
import { HealthModule } from "./health/health.module"
import { MailModule } from "./mail/mail.module"
import { RegistrationModule } from "./registration/registration.module"
import { ReportsModule } from "./reports/reports.module"
import { StripeModule } from "./stripe/stripe.module"

@Module({
	imports: [
		ScheduleModule.forRoot(),
		CoreModule,
		DatabaseModule,
		EventsModule,
		GolfgeniusModule,
		HealthModule,
		MailModule,
		RegistrationModule,
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

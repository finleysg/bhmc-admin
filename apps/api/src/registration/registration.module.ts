import { forwardRef, Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { EventsModule } from "../events/events.module"
import { MailModule } from "../mail/mail.module"
import { StripeModule } from "../stripe/stripe.module"
import { RegistrationRepository, RegistrationService } from "./"
import { RegistrationCleanupCron } from "./cron/registration-cleanup.cron"
import { RegistrationController } from "./registration.controller"
import { RegistrationFlowService } from "./registration-flow.service"
import { UserRegistrationController } from "./user-registration.controller"

@Module({
	imports: [
		CoursesModule,
		DatabaseModule,
		EventsModule,
		MailModule,
		forwardRef(() => StripeModule),
	],
	controllers: [RegistrationController, UserRegistrationController],
	providers: [
		RegistrationCleanupCron,
		RegistrationFlowService,
		RegistrationRepository,
		RegistrationService,
	],
	exports: [RegistrationFlowService, RegistrationRepository, RegistrationService],
})
export class RegistrationModule {}

import { forwardRef, Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { EventsModule } from "../events/events.module"
import { MailModule } from "../mail/mail.module"
import { StripeModule } from "../stripe/stripe.module"
import {
	AdminRegistrationController,
	UserRegistrationController,
	RegistrationCleanupCron,
	PaymentsRepository,
	RegistrationRepository,
	UserPaymentsService,
	UserRegistrationService,
	AdminRegistrationService,
	UserPaymentsController,
} from "./"

@Module({
	imports: [
		CoursesModule,
		DatabaseModule,
		EventsModule,
		MailModule,
		forwardRef(() => StripeModule),
	],
	controllers: [AdminRegistrationController, UserPaymentsController, UserRegistrationController],
	providers: [
		AdminRegistrationService,
		PaymentsRepository,
		RegistrationCleanupCron,
		RegistrationRepository,
		UserPaymentsService,
		UserRegistrationService,
	],
	exports: [
		AdminRegistrationService,
		UserPaymentsService,
		UserRegistrationService,
		PaymentsRepository,
		RegistrationRepository,
	],
})
export class RegistrationModule {}

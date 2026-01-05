import { forwardRef, Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { EventsModule } from "../events/events.module"
import { MailModule } from "../mail/mail.module"
import { StripeModule } from "../stripe/stripe.module"
import {
	AdminRegistrationController,
	RegistrationLiveController,
	UserRegistrationController,
	RegistrationCleanupCron,
	PaymentsRepository,
	RegistrationRepository,
	UserPaymentsService,
	UserRegistrationService,
	AdminRegistrationService,
	UserPaymentsController,
	RegistrationBroadcastService,
	RegistrationDataService,
} from "./"

@Module({
	imports: [
		CoursesModule,
		DatabaseModule,
		EventsModule,
		MailModule,
		forwardRef(() => StripeModule),
	],
	controllers: [
		AdminRegistrationController,
		RegistrationLiveController,
		UserPaymentsController,
		UserRegistrationController,
	],
	providers: [
		AdminRegistrationService,
		PaymentsRepository,
		RegistrationBroadcastService,
		RegistrationCleanupCron,
		RegistrationDataService,
		RegistrationRepository,
		UserPaymentsService,
		UserRegistrationService,
	],
	exports: [
		AdminRegistrationService,
		RegistrationBroadcastService,
		UserPaymentsService,
		UserRegistrationService,
		PaymentsRepository,
		RegistrationRepository,
	],
})
export class RegistrationModule {}

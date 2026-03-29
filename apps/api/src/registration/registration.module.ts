import { forwardRef, Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { EventsModule } from "../events/events.module"
import { MailModule } from "../mail/mail.module"
import { StripeModule } from "../stripe/stripe.module"
import {
	AdminRegistrationController,
	TestRegistrationController,
	RegistrationLiveController,
	UserRegistrationController,
	RegistrationCleanupCron,
	ChangeLogRepository,
	PaymentsRepository,
	RegistrationRepository,
	ChangeLogService,
	PaymentsService,
	RegistrationService,
	AdminRegistrationService,
	UserPaymentsController,
	RegistrationBroadcastService,
	RegistrationDataService,
	RefundService,
	PlayerService,
	CleanupService,
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
		TestRegistrationController,
		RegistrationLiveController,
		UserPaymentsController,
		UserRegistrationController,
	],
	providers: [
		AdminRegistrationService,
		ChangeLogRepository,
		ChangeLogService,
		CleanupService,
		PaymentsRepository,
		PaymentsService,
		PlayerService,
		RefundService,
		RegistrationBroadcastService,
		RegistrationCleanupCron,
		RegistrationDataService,
		RegistrationRepository,
		RegistrationService,
	],
	exports: [
		AdminRegistrationService,
		ChangeLogRepository,
		ChangeLogService,
		CleanupService,
		PaymentsService,
		PlayerService,
		RefundService,
		RegistrationBroadcastService,
		RegistrationService,
	],
})
export class RegistrationModule {}

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
	PaymentsService,
	RegistrationService,
	AdminRegistrationService,
	UserPaymentsController,
	RegistrationBroadcastService,
	RegistrationDataService,
	RefundService,
	PlayerService,
	CleanupService,
	BulkRefundProgressTracker,
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
		BulkRefundProgressTracker,
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
		BulkRefundProgressTracker,
		CleanupService,
		PaymentsService,
		PlayerService,
		RefundService,
		RegistrationBroadcastService,
		RegistrationService,
	],
})
export class RegistrationModule {}

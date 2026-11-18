import { forwardRef, Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { EventsModule } from "../events/events.module"
import { MailModule } from "../mail/mail.module"
import { PublicSiteModule } from "../public-site"
import { StripeModule } from "../stripe/stripe.module"
import {
	AdminRegistrationController,
	RegistrationLiveController,
	UserRegistrationController,
	RegistrationCleanupCron,
	StalePaymentCron,
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
	StalePaymentService,
	InspectorController,
	InspectorRepository,
	InspectorService,
} from "./"

@Module({
	imports: [
		CoursesModule,
		DatabaseModule,
		EventsModule,
		MailModule,
		PublicSiteModule,
		forwardRef(() => StripeModule),
	],
	controllers: [
		AdminRegistrationController,
		InspectorController,
		RegistrationLiveController,
		UserPaymentsController,
		UserRegistrationController,
	],
	providers: [
		AdminRegistrationService,
		ChangeLogRepository,
		ChangeLogService,
		CleanupService,
		InspectorRepository,
		InspectorService,
		PaymentsRepository,
		PaymentsService,
		PlayerService,
		RefundService,
		RegistrationBroadcastService,
		RegistrationCleanupCron,
		RegistrationDataService,
		RegistrationRepository,
		RegistrationService,
		StalePaymentCron,
		StalePaymentService,
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

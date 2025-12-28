import { forwardRef, Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { EventsModule } from "../events/events.module"
import { MailModule } from "../mail/mail.module"
import { StripeModule } from "../stripe/stripe.module"
import { RegistrationRepository, RegistrationService } from "./"
import { RegistrationController } from "./registration.controller"

@Module({
	imports: [
		CoursesModule,
		DatabaseModule,
		EventsModule,
		MailModule,
		forwardRef(() => StripeModule),
	],
	controllers: [RegistrationController],
	providers: [RegistrationRepository, RegistrationService],
	exports: [RegistrationRepository, RegistrationService],
})
export class RegistrationModule {}

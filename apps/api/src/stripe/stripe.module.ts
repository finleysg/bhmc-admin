import { forwardRef, Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"

import { DatabaseModule } from "../database/database.module"
import { EventsModule } from "../events/events.module"
import { MailModule } from "../mail/mail.module"
import { RegistrationModule } from "../registration/registration.module"
import { stripeValidationSchema } from "./config/stripe.validation"
import { StripeController } from "./stripe.controller"
import { StripeService } from "./stripe.service"
import { StripeWebhookService } from "./stripe-webhook.service"

@Module({
	imports: [
		ConfigModule.forRoot({
			validationSchema: stripeValidationSchema,
			validationOptions: { allowUnknown: true },
		}),
		DatabaseModule,
		EventsModule,
		MailModule,
		forwardRef(() => RegistrationModule),
	],
	controllers: [StripeController],
	providers: [StripeService, StripeWebhookService],
	exports: [StripeService],
})
export class StripeModule {}

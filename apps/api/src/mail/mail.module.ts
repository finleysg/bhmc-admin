import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"

import { mailValidationSchema } from "./config/mail.validation"
import { MailService } from "./mail.service"

@Module({
	imports: [
		ConfigModule.forRoot({
			validationSchema: mailValidationSchema,
			validationOptions: { allowUnknown: true },
		}),
	],
	providers: [MailService],
	exports: [MailService],
})
export class MailModule {}

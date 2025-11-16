import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { RegistrationDomainService, RegistrationService } from "./"
import { RegistrationController } from "./registration.controller"

@Module({
	imports: [DatabaseModule],
	controllers: [RegistrationController],
	providers: [RegistrationService, RegistrationDomainService],
	exports: [RegistrationService, RegistrationDomainService],
})
export class RegistrationModule {}

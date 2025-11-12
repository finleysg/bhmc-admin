import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { RegistrationDomainService, RegistrationService } from "./"

@Module({
	imports: [DatabaseModule],
	providers: [RegistrationService, RegistrationDomainService],
	exports: [RegistrationService, RegistrationDomainService],
})
export class RegistrationModule {}

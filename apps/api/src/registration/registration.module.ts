import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { RegistrationService } from "./registration.service"

@Module({
	imports: [DatabaseModule],
	providers: [RegistrationService],
	exports: [RegistrationService],
})
export class RegistrationModule {}

import { Global, Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"

import { AuthUserRepository } from "./auth-user.repository"
import { DjangoAuthService } from "./django-auth.service"

@Global()
@Module({
	imports: [DatabaseModule],
	providers: [DjangoAuthService, AuthUserRepository],
	exports: [DjangoAuthService, AuthUserRepository],
})
export class AuthModule {}

import { Global, Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"

import { AuthUserRepository } from "./auth-user.repository"
import { DjangoAuthService } from "./django-auth.service"
import { PlayerRolesController } from "./player-roles.controller"
import { PlayerRolesRepository } from "./player-roles.repository"
import { PlayerRolesService } from "./player-roles.service"

@Global()
@Module({
	imports: [DatabaseModule],
	controllers: [PlayerRolesController],
	providers: [DjangoAuthService, AuthUserRepository, PlayerRolesRepository, PlayerRolesService],
	exports: [DjangoAuthService, AuthUserRepository],
})
export class AuthModule {}

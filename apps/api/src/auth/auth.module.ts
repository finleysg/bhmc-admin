import { Global, Module } from "@nestjs/common"

import { DjangoAuthService } from "./django-auth.service"

@Global()
@Module({
	providers: [DjangoAuthService],
	exports: [DjangoAuthService],
})
export class AuthModule {}

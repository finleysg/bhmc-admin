import { Module, Controller, Get } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { JwtAuthGuard } from "./auth/jwt.guard"

@Controller()
class HealthController {
	@Get("health")
	health() {
		return { status: "ok" }
	}
}

@Module({
	imports: [],
	controllers: [HealthController],
	providers: [
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
		},
	],
})
export class AppModule {}

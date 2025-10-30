import { Module, Controller, Get } from "@nestjs/common"
import { JwtAuthGuard } from "./auth/jwt.guard"
import { APP_GUARD } from "@nestjs/core"

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

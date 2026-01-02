import { Request } from "express"
import { DjangoUser } from "@repo/domain/types"

export interface AuthenticatedRequest extends Request {
	user: DjangoUser
}

export * from "./decorators"
export { AuthModule } from "./auth.module"
export { AuthUserRepository } from "./auth-user.repository"
export { DjangoAuthService } from "./django-auth.service"
export { JwtAuthGuard } from "./jwt.guard"

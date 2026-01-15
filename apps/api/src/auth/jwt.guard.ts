import { Request } from "express"

import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Inject,
	Injectable,
	Logger,
	ServiceUnavailableException,
	UnauthorizedException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { DjangoUser } from "@repo/domain/types"

import { IS_PUBLIC_KEY } from "./decorators/public.decorator"
import { ROLES_KEY, Role } from "./decorators/roles.decorator"
import { DjangoAuthService } from "./django-auth.service"
import { AuthenticatedRequest } from "."

@Injectable()
export class JwtAuthGuard implements CanActivate {
	private readonly logger = new Logger(JwtAuthGuard.name)

	constructor(
		@Inject(Reflector) private readonly reflector: Reflector,
		@Inject(DjangoAuthService) private readonly authService: DjangoAuthService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Check @Public() metadata - skip auth entirely
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		])
		if (isPublic) {
			return true
		}

		const req = context.switchToHttp().getRequest<AuthenticatedRequest>()

		// Extract token
		const token = this.extractToken(req)
		if (!token) {
			throw new UnauthorizedException("Missing authorization token")
		}

		// Validate token via DjangoAuthService
		let user: DjangoUser | null
		try {
			user = await this.authService.validateToken(token)
		} catch (error) {
			this.logger.error("Auth service error", error)
			throw new ServiceUnavailableException("Authentication service unavailable")
		}

		if (!user) {
			throw new UnauthorizedException("Invalid or expired token")
		}

		// Attach user to request
		req.user = user

		// Check role hierarchy
		const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		])

		if (!requiredRoles || requiredRoles.length === 0) {
			// No roles required - authenticated user is sufficient
			return true
		}

		// Check role hierarchy
		if (requiredRoles.includes("superadmin")) {
			if (!user.isSuperuser) {
				throw new ForbiddenException("Superadmin access required")
			}
		} else if (requiredRoles.includes("admin")) {
			if (!user.isStaff && !user.isSuperuser) {
				throw new ForbiddenException("Admin access required")
			}
		} else {
			// Unknown role - deny by default
			this.logger.error(`Unknown role(s) required: ${requiredRoles.join(", ")}`)
			throw new ForbiddenException("Invalid role configuration")
		}

		return true
	}

	private extractToken(req: Request): string | null {
		// Try cookie first
		if (req.cookies?.access_token) {
			return req.cookies.access_token as string
		}

		// Fallback to Authorization header
		const auth = req.headers["authorization"] || req.headers["Authorization"]
		if (!auth || Array.isArray(auth)) return null

		const parts = auth.split(" ")
		if (parts.length !== 2) return null

		const [scheme, token] = parts
		if (!/^(Token|Bearer)$/i.test(scheme)) return null

		return token
	}
}

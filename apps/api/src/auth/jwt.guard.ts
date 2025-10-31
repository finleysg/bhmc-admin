import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"
import { Request } from "express"
import jwt from "jsonwebtoken"

@Injectable()
export class JwtAuthGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const req = context.switchToHttp().getRequest<Request>()
		const auth = req.headers["authorization"] || req.headers["Authorization"]
		if (!auth || Array.isArray(auth)) return false

		const parts = auth.split(" ")
		if (parts.length !== 2) return false
		const [scheme, token] = parts
		if (!/^Bearer$/i.test(scheme)) return false

		const secret = process.env.BETTER_AUTH_JWT_SECRET
		if (!secret) return false

		try {
			// jwt.verify will throw if invalid
			jwt.verify(token, secret)
			return true
		} catch {
			return false
		}
	}
}

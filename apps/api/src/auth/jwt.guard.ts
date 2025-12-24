import { Request } from "express"

import axios from "axios"

import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common"

/**
 * Authentication guard that validates Django auth tokens.
 *
 * Expects requests with Authorization header: "Token <token>"
 * Validates the token by calling Django's /auth/users/me/ endpoint.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
	private readonly logger = new Logger(JwtAuthGuard.name)
	private readonly djangoApiUrl: string

	constructor() {
		this.djangoApiUrl = process.env.DJANGO_API_URL || "http://localhost:8000"
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest<Request>()

		// Skip authentication for public endpoints
		if (req.url === "/health" || req.url === "/health/db" || req.url === "/stripe/webhook") {
			return true
		}

		const auth = req.headers["authorization"] || req.headers["Authorization"]
		if (!auth || Array.isArray(auth)) return false

		const parts = auth.split(" ")
		if (parts.length !== 2) return false

		const [scheme, token] = parts

		// Accept both "Token" (Django style) and "Bearer" (for backwards compatibility)
		if (!/^(Token|Bearer)$/i.test(scheme)) return false

		try {
			const response = await axios.get(`${this.djangoApiUrl}/auth/users/me/`, {
				headers: {
					Authorization: `Token ${token}`,
				},
				timeout: 5000,
			})

			// If we get a successful response, the token is valid
			// Optionally attach user info to the request for downstream use
			if (response.status === 200 && response.data) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
				;(req as any).user = response.data
				return true
			}

			return false
		} catch (error) {
			if (axios.isAxiosError(error)) {
				if (error.response?.status === 401) {
					this.logger.debug("Token validation failed: unauthorized")
					return false
				} else if (error.response?.status && error.response.status >= 500) {
					this.logger.error(`Django service error: ${error.response.status}`)
					throw new Error("Authentication service unavailable")
				} else if (!error.response) {
					this.logger.error(`Django service unreachable: ${error.message}`)
					throw new Error("Authentication service unavailable")
				} else {
					this.logger.warn(`Token validation error: ${error.message}`)
					return false
				}
			} else {
				this.logger.error(
					`Unexpected error validating token: ${error instanceof Error ? error.message : String(error)}`,
				)
				throw error
			}
		}
	}
}

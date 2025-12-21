import axios from "axios"

import { Injectable, Logger } from "@nestjs/common"
import { DjangoUser, DjangoUserResponse } from "@repo/domain/types"
import { transformDjangoUser } from "@repo/domain/functions"

@Injectable()
export class DjangoAuthService {
	private readonly logger = new Logger(DjangoAuthService.name)
	private readonly djangoApiUrl: string

	constructor() {
		this.djangoApiUrl = process.env.DJANGO_API_URL || "http://localhost:8000"
	}

	/**
	 * Validates a Django auth token by calling Django's /auth/users/me/ endpoint.
	 * Returns the user if valid, null if invalid.
	 */
	async validateToken(token: string): Promise<DjangoUser | null> {
		try {
			const response = await axios.get<DjangoUserResponse>(`${this.djangoApiUrl}/auth/users/me/`, {
				headers: {
					Authorization: `Token ${token}`,
				},
				timeout: 5000,
			})

			return transformDjangoUser(response.data)
		} catch (error) {
			if (axios.isAxiosError(error)) {
				if (error.response?.status === 401) {
					this.logger.debug("Token validation failed: unauthorized")
				} else {
					this.logger.warn(`Token validation error: ${error.message}`)
				}
			} else {
				this.logger.error("Unexpected error validating token", error)
			}
			return null
		}
	}
}

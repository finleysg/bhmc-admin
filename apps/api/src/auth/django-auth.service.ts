import axios from "axios"

import { Injectable, Logger } from "@nestjs/common"

interface DjangoUserResponse {
	id: number
	email: string
	first_name: string
	last_name: string
	is_active: boolean
	is_staff: boolean
	ghin: string | null
	birth_date: string | null
}

export interface DjangoUser {
	id: number
	email: string
	firstName: string
	lastName: string
	isActive: boolean
	isStaff: boolean
	ghin: string | null
	birthDate: string | null
}

// Helper function to transform API response
function transformDjangoUser(response: DjangoUserResponse): DjangoUser {
	return {
		id: response.id,
		email: response.email,
		firstName: response.first_name,
		lastName: response.last_name,
		isActive: response.is_active,
		isStaff: response.is_staff,
		ghin: response.ghin,
		birthDate: response.birth_date,
	}
}

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

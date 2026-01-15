import axios from "axios"

import {
	Inject,
	Injectable,
	InternalServerErrorException,
	Logger,
	ServiceUnavailableException,
} from "@nestjs/common"
import { DjangoUser, DjangoUserResponse } from "@repo/domain/types"
import { transformDjangoUser } from "@repo/domain/functions"

import { toDbString } from "../database"

import { AuthUserRepository } from "./auth-user.repository"

@Injectable()
export class DjangoAuthService {
	private readonly logger = new Logger(DjangoAuthService.name)
	private readonly djangoApiUrl: string

	constructor(@Inject(AuthUserRepository) private readonly authUserRepository: AuthUserRepository) {
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
					return null
				}
				if (error.response?.status && error.response.status >= 500) {
					this.logger.error(`Django service error: ${error.response.status}`)
					throw new InternalServerErrorException("Authentication service unavailable")
				}
				if (!error.response) {
					this.logger.error(`Django service unreachable: ${error.message}`)
					throw new ServiceUnavailableException("Authentication service unavailable")
				}
				this.logger.warn(`Token validation error: ${error.message}`)
			} else {
				this.logger.error("Unexpected error validating token", error)
			}
			return null
		}
	}

	async findById(id: number): Promise<DjangoUser | null> {
		const row = await this.authUserRepository.findById(id)
		if (!row) return null

		return {
			id: row.id,
			email: row.email,
			firstName: row.firstName,
			lastName: row.lastName,
			isActive: Boolean(row.isActive),
			isStaff: Boolean(row.isStaff),
			isSuperuser: Boolean(row.isSuperuser),
			ghin: null,
			birthDate: null,
			playerId: 0,
		}
	}

	async getOrCreateSystemUser(username: string): Promise<number> {
		const existing = await this.authUserRepository.findByUsername(username)
		if (existing) return existing.id

		const now = toDbString(new Date())
		return this.authUserRepository.create({
			username,
			email: `${username.replace("_", "@")}.local`,
			password: "",
			firstName: username
				.split("_")
				.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
				.join(" "),
			lastName: "System",
			isActive: 0,
			isStaff: 0,
			isSuperuser: 0,
			dateJoined: now,
		})
	}
}

import {
	ActivateData,
	ChangePasswordData,
	LoginData,
	RegisterData,
	RequestPasswordData,
	ResetPasswordData,
	User,
	UserApiSchema,
	UserData,
} from "../models/auth"
import { httpClient } from "../utils/api-client"
import { authUrl } from "../utils/api-utils"

export type NewUser = Pick<UserData, "email" | "first_name" | "last_name" | "is_active">

export interface IAuthenticationProvider {
	getUser: () => Promise<User>
	login: (data: LoginData) => Promise<void>
	logout: () => Promise<void>
	register: (data: RegisterData) => Promise<NewUser>
	activate: (data: ActivateData) => Promise<void>
	requestPasswordReset: (data: RequestPasswordData) => Promise<void>
	resetPassword: (data: ResetPasswordData) => Promise<void>
	changePassword: (data: ChangePasswordData) => Promise<void>
}

export class DefaultAuthenticationProvider implements IAuthenticationProvider {
	public async getUser() {
		const endpoint = authUrl("users/me")
		return httpClient(endpoint)
			.then((data: unknown) => {
				return new User(UserApiSchema.parse(data))
			})
			.catch(() => {
				return new User(null)
			})
	}

	public async login(data: LoginData) {
		const endpoint = authUrl("token/login")
		return httpClient(endpoint, { body: JSON.stringify(data) }) as Promise<void>
	}

	public async logout() {
		const endpoint = authUrl("token/logout")
		return httpClient(endpoint, { method: "POST" }) as Promise<void>
	}

	public async register(data: RegisterData) {
		const endpoint = authUrl("users")
		return httpClient(endpoint, { body: JSON.stringify(data) }) as Promise<NewUser>
	}

	public async activate(data: ActivateData) {
		const endpoint = authUrl("users/activation")
		return httpClient(endpoint, { body: JSON.stringify(data) }) as Promise<void>
	}

	public async requestPasswordReset(data: RequestPasswordData) {
		const endpoint = authUrl("users/reset_password")
		return httpClient(endpoint, { body: JSON.stringify(data) }) as Promise<void>
	}

	public async resetPassword(data: ResetPasswordData) {
		const endpoint = authUrl("users/reset_password_confirm")
		return httpClient(endpoint, { body: JSON.stringify(data) }) as Promise<void>
	}

	public async changePassword(data: ChangePasswordData) {
		const endpoint = authUrl("users/set_password")
		return httpClient(endpoint, { body: JSON.stringify(data) }) as Promise<void>
	}
}

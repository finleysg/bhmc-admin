import { transformDjangoUser } from "@repo/domain/functions"
import { DjangoUser, DjangoUserResponse } from "@repo/domain/types"

import type { RegisterData } from "./schemas/auth"

interface LoginError {
	non_field_errors?: string[]
	email?: string[]
	password?: string[]
}

interface DjangoFieldErrors {
	[key: string]: string[]
}

export type AuthResult = { success: true } | { success: false; error: string }
export type RegisterResult =
	| { success: true }
	| { success: false; error: string; fieldErrors?: Record<string, string> }

export async function login(
	email: string,
	password: string,
): Promise<{ success: true; user: DjangoUser } | { success: false; error: string }> {
	try {
		const response = await fetch("/api/auth/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			body: JSON.stringify({ email, password }),
		})

		if (!response.ok) {
			const text = await response.text()
			if (text) {
				const errorData = JSON.parse(text) as LoginError
				const errorMessage =
					errorData.non_field_errors?.[0] ||
					errorData.email?.[0] ||
					errorData.password?.[0] ||
					"Login failed"
				return { success: false, error: errorMessage }
			}
			return { success: false, error: "Login failed" }
		}

		const user = await getCurrentUser()
		if (!user) {
			return { success: false, error: "Failed to get user after login" }
		}

		return { success: true, user }
	} catch (error) {
		console.error("Login error:", error)
		return { success: false, error: "Network error. Please try again." }
	}
}

export async function logout(): Promise<{ success: boolean }> {
	try {
		const response = await fetch("/api/auth/logout", {
			method: "POST",
			credentials: "include",
		})

		return { success: response.ok || response.status === 204 }
	} catch (error) {
		console.error("Logout error:", error)
		return { success: false }
	}
}

export async function getCurrentUser(): Promise<DjangoUser | null> {
	try {
		const response = await fetch("/api/auth/me", {
			method: "GET",
			credentials: "include",
		})

		if (!response.ok) {
			return null
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const user = await response.json()
		const djangoUser = user as DjangoUserResponse

		return transformDjangoUser(djangoUser)
	} catch (error) {
		console.error("Get current user error:", error)
		return null
	}
}

export async function checkAuth(): Promise<boolean> {
	const user = await getCurrentUser()
	return user !== null
}

export async function register(data: RegisterData): Promise<RegisterResult> {
	try {
		const response = await fetch("/api/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		})

		if (response.status === 201) {
			return { success: true }
		}

		const errorData = (await response.json()) as DjangoFieldErrors | string[]
		const allMessages = Array.isArray(errorData)
			? errorData
			: Object.values(errorData).flat()
		const isDuplicate = allMessages.some((msg) => msg.toLowerCase().includes("already exists"))

		if (isDuplicate) {
			return {
				success: false,
				error: "An account with this email already exists.",
			}
		}

		if (Array.isArray(errorData)) {
			return { success: false, error: errorData[0] ?? "Registration failed" }
		}

		const fieldErrors: Record<string, string> = {}
		for (const [key, messages] of Object.entries(errorData)) {
			if (messages[0]) {
				fieldErrors[key] = messages[0]
			}
		}

		const firstError = Object.values(fieldErrors)[0] ?? "Registration failed"
		return { success: false, error: firstError, fieldErrors }
	} catch (error) {
		console.error("Registration error:", error)
		return { success: false, error: "Network error. Please try again." }
	}
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
	try {
		await fetch("/api/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		})

		// Always return success — Django returns 204 regardless of whether the email exists
		return { success: true }
	} catch (error) {
		console.error("Password reset request error:", error)
		return { success: false, error: "Network error. Please try again." }
	}
}

export async function resetPasswordConfirm(data: {
	uid: string
	token: string
	new_password: string
	re_new_password: string
}): Promise<AuthResult> {
	try {
		const response = await fetch("/api/auth/reset-password-confirm", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		})

		if (response.status === 204) {
			return { success: true }
		}

		const errorData = (await response.json()) as DjangoFieldErrors
		const errorMessage =
			errorData.token?.[0] ??
			errorData.non_field_errors?.[0] ??
			Object.values(errorData).flat()[0] ??
			"Password reset failed"
		return { success: false, error: errorMessage }
	} catch (error) {
		console.error("Password reset confirm error:", error)
		return { success: false, error: "Network error. Please try again." }
	}
}

export async function activateAccount(uid: string, token: string): Promise<AuthResult> {
	try {
		const response = await fetch("/api/auth/activation", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ uid, token }),
		})

		if (response.status === 204) {
			return { success: true }
		}

		const errorData = (await response.json()) as DjangoFieldErrors
		const errorMessage =
			errorData.detail?.[0] ??
			errorData.token?.[0] ??
			Object.values(errorData).flat()[0] ??
			"Account activation failed"
		return { success: false, error: errorMessage }
	} catch (error) {
		console.error("Activation error:", error)
		return { success: false, error: "Network error. Please try again." }
	}
}

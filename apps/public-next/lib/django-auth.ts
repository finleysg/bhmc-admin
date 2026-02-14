import { transformDjangoUser } from "@repo/domain/functions"
import { DjangoUser, DjangoUserResponse } from "@repo/domain/types"

interface LoginError {
	non_field_errors?: string[]
	email?: string[]
	password?: string[]
}

const DJANGO_URL = process.env.NEXT_PUBLIC_DJANGO_URL || "http://localhost:8000"

export async function login(
	email: string,
	password: string,
): Promise<{ success: true; user: DjangoUser } | { success: false; error: string }> {
	try {
		const response = await fetch(`${DJANGO_URL}/auth/token/login/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			body: JSON.stringify({ email, password }),
		})

		if (!response.ok) {
			const errorData = (await response.json()) as LoginError
			const errorMessage =
				errorData.non_field_errors?.[0] ||
				errorData.email?.[0] ||
				errorData.password?.[0] ||
				"Login failed"
			return { success: false, error: errorMessage }
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
		const response = await fetch(`${DJANGO_URL}/auth/token/logout/`, {
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
		const response = await fetch(`${DJANGO_URL}/auth/users/me/`, {
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

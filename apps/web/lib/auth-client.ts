import { createAuthClient } from "better-auth/client"

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
})

export async function signIn(email: string, password: string) {
	try {
		const result = await authClient.signIn.email({
			email,
			password,
		})
		return result
	} catch (error) {
		console.error("Sign-in error:", error)
		throw error
	}
}

export async function signOut() {
	try {
		await authClient.signOut()
	} catch (error) {
		console.error("Sign-out error:", error)
		throw error
	}
}

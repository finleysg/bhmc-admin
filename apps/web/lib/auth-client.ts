import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
	baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
})

// Keep the simple wrappers the app expects
export async function signIn(email: string, password: string) {
	try {
		return await authClient.signIn.email({ email, password })
	} catch (err) {
		console.error("Sign-in error:", err)
		throw err
	}
}

export async function signOut() {
	try {
		return await authClient.signOut()
	} catch (err) {
		console.error("Sign-out error:", err)
		throw err
	}
}

// Export hooks/helpers from the client
export const { useSession, getSession } = authClient

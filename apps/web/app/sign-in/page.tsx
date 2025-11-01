"use client"

import { useState } from "react"

import { useRouter } from "next/navigation"

import { signIn } from "../../lib/auth-client"

export default function SignInPage() {
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState("")
	const router = useRouter()

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		void handleSignIn()
	}

	const handleSignIn = async () => {
		setIsLoading(true)
		setError("")

		try {
			const result = await signIn(email, password)

			if (result.error) {
				setError(result.error.message || "Sign-in failed")
			} else {
				// Redirect to dashboard or home page on success
				router.push("/")
			}
		} catch (err) {
			setError("An unexpected error occurred")
			console.error("Sign-in error:", err)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4">
            /* TODO: Create a sign in form */
		</div>
	)
}

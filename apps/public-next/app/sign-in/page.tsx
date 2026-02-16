"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SignInPage() {
	const router = useRouter()
	const { login } = useAuth()
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		setError("")
		setLoading(true)

		const result = await login(email, password)

		if (result.success) {
			router.push("/")
		} else {
			setError(result.error ?? "Login failed")
		}
		setLoading(false)
	}

	return (
		<div className="mx-auto max-w-sm space-y-6 pt-8">
			<div className="space-y-2 text-center">
				<h1 className="text-2xl font-bold">Sign In</h1>
				<p className="text-sm text-muted-foreground">
					Enter your credentials to access your account
				</p>
			</div>

			<form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
				{error && <div className="rounded-md bg-destructive p-3 text-sm text-white">{error}</div>}

				<div className="space-y-2">
					<label htmlFor="email" className="text-sm font-medium">
						Email
					</label>
					<Input
						id="email"
						type="email"
						autoComplete="username"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="you@example.com"
						required
					/>
				</div>

				<div className="space-y-2">
					<label htmlFor="password" className="text-sm font-medium">
						Password
					</label>
					<Input
						id="password"
						type="password"
						autoComplete="current-password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>

				<Button type="submit" className="w-full" disabled={loading}>
					{loading ? "Signing in..." : "Sign In"}
				</Button>
			</form>

			<div className="space-y-2 text-center text-sm text-muted-foreground">
				<p>
					<Link href="/reset-password" className="text-primary underline-offset-4 hover:underline">
						Forgot your password?
					</Link>
				</p>
				<p>
					Don&apos;t have an account?{" "}
					<Link href="/sign-up" className="text-primary underline-offset-4 hover:underline">
						Sign up
					</Link>
				</p>
			</div>
		</div>
	)
}

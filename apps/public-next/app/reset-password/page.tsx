"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { requestPasswordReset } from "@/lib/django-auth"
import { RequestPasswordSchema } from "@/lib/schemas/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ResetPasswordPage() {
	const router = useRouter()
	const [email, setEmail] = useState("")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		setError("")

		const validation = RequestPasswordSchema.safeParse({ email })
		if (!validation.success) {
			setError(validation.error.issues[0]?.message ?? "Invalid email")
			return
		}

		setLoading(true)
		const result = await requestPasswordReset(email)

		if (result.success) {
			router.push(`/reset-password/sent?email=${encodeURIComponent(email)}`)
		} else {
			setError(result.error)
		}
		setLoading(false)
	}

	return (
		<div className="mx-auto max-w-sm space-y-6 pt-8">
			<div className="space-y-2 text-center">
				<h1 className="text-2xl font-bold">Reset Password</h1>
				<p className="text-sm text-muted-foreground">
					Enter your email address and we&apos;ll send you a link to reset your password.
				</p>
			</div>

			<form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
				{error && (
					<div className="rounded-md bg-destructive p-3 text-sm text-white">{error}</div>
				)}

				<div className="space-y-2">
					<label htmlFor="email" className="text-sm font-medium">
						Email
					</label>
					<Input
						id="email"
						type="email"
						autoComplete="email"
						value={email}
						onChange={(e) => {
							setEmail(e.target.value)
							setError("")
						}}
						placeholder="you@example.com"
						required
					/>
				</div>

				<Button type="submit" className="w-full" disabled={loading}>
					{loading ? "Sending..." : "Send Reset Link"}
				</Button>
			</form>

			<p className="text-center text-sm text-muted-foreground">
				<Link
					href="/sign-in"
					className="text-primary underline-offset-4 hover:underline"
				>
					Back to sign in
				</Link>
			</p>
		</div>
	)
}

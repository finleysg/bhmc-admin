"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { register, type RegisterResult } from "@/lib/django-auth"
import { RegisterAccountSchema, type RegisterData } from "@/lib/schemas/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const defaultFormData: RegisterData = {
	first_name: "",
	last_name: "",
	email: "",
	ghin: "",
	password: "",
	re_password: "",
}

export default function SignUpPage() {
	const router = useRouter()
	const [formData, setFormData] = useState<RegisterData>(defaultFormData)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [generalError, setGeneralError] = useState("")
	const [loading, setLoading] = useState(false)

	function handleChange(field: keyof RegisterData, value: string) {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
		setGeneralError("")
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		setGeneralError("")

		const validation = RegisterAccountSchema.safeParse(formData)
		if (!validation.success) {
			const fieldErrors: Record<string, string> = {}
			for (const issue of validation.error.issues) {
				const key = String(issue.path[0])
				if (key && !fieldErrors[key]) {
					fieldErrors[key] = issue.message
				}
			}
			setErrors(fieldErrors)
			return
		}

		setLoading(true)
		const result: RegisterResult = await register(validation.data)

		if (result.success) {
			router.push(`/sign-up/confirm?email=${encodeURIComponent(formData.email)}`)
		} else {
			if (!result.success && result.fieldErrors) {
				setErrors(result.fieldErrors)
			}
			setGeneralError(result.error)
		}
		setLoading(false)
	}

	return (
		<div className="mx-auto max-w-sm space-y-6 pt-8">
			<div className="space-y-2 text-center">
				<h1 className="text-2xl font-bold">Create Account</h1>
				<p className="text-sm text-muted-foreground">
					Sign up to register for events and manage your profile
				</p>
			</div>

			<form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
				{generalError && (
					<div className="rounded-md bg-destructive p-3 text-sm text-white">
						{generalError}
					</div>
				)}

				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<label htmlFor="first_name" className="text-sm font-medium">
							First Name
						</label>
						<Input
							id="first_name"
							value={formData.first_name}
							onChange={(e) => handleChange("first_name", e.target.value)}
							required
						/>
						{errors.first_name && (
							<p className="text-xs text-destructive">{errors.first_name}</p>
						)}
					</div>
					<div className="space-y-2">
						<label htmlFor="last_name" className="text-sm font-medium">
							Last Name
						</label>
						<Input
							id="last_name"
							value={formData.last_name}
							onChange={(e) => handleChange("last_name", e.target.value)}
							required
						/>
						{errors.last_name && (
							<p className="text-xs text-destructive">{errors.last_name}</p>
						)}
					</div>
				</div>

				<div className="space-y-2">
					<label htmlFor="email" className="text-sm font-medium">
						Email
					</label>
					<Input
						id="email"
						type="email"
						autoComplete="email"
						value={formData.email}
						onChange={(e) => handleChange("email", e.target.value)}
						placeholder="you@example.com"
						required
					/>
					{errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
				</div>

				<div className="space-y-2">
					<label htmlFor="ghin" className="text-sm font-medium">
						GHIN{" "}
						<span className="font-normal text-muted-foreground">(optional)</span>
					</label>
					<Input
						id="ghin"
						value={formData.ghin}
						onChange={(e) => handleChange("ghin", e.target.value)}
					/>
					{errors.ghin && <p className="text-xs text-destructive">{errors.ghin}</p>}
				</div>

				<div className="space-y-2">
					<label htmlFor="password" className="text-sm font-medium">
						Password
					</label>
					<Input
						id="password"
						type="password"
						autoComplete="new-password"
						value={formData.password}
						onChange={(e) => handleChange("password", e.target.value)}
						required
					/>
					{errors.password && (
						<p className="text-xs text-destructive">{errors.password}</p>
					)}
				</div>

				<div className="space-y-2">
					<label htmlFor="re_password" className="text-sm font-medium">
						Confirm Password
					</label>
					<Input
						id="re_password"
						type="password"
						autoComplete="new-password"
						value={formData.re_password}
						onChange={(e) => handleChange("re_password", e.target.value)}
						required
					/>
					{errors.re_password && (
						<p className="text-xs text-destructive">{errors.re_password}</p>
					)}
				</div>

				<Button type="submit" className="w-full" disabled={loading}>
					{loading ? "Creating Account..." : "Create Account"}
				</Button>
			</form>

			<p className="text-center text-sm text-muted-foreground">
				Already have an account?{" "}
				<Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
					Sign in
				</Link>
			</p>
		</div>
	)
}

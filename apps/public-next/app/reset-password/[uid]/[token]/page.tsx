"use client"

import { FormEvent, useState } from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { resetPasswordConfirm } from "@/lib/django-auth"
import { ResetPasswordSchema, type ResetPasswordData } from "@/lib/schemas/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ResetPasswordConfirmPage({
	params,
}: {
	params: Promise<{ uid: string; token: string }>
}) {
	const { uid, token } = use(params)
	const router = useRouter()
	const [formData, setFormData] = useState<ResetPasswordData>({
		new_password: "",
		re_new_password: "",
	})
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [generalError, setGeneralError] = useState("")
	const [loading, setLoading] = useState(false)

	function handleChange(field: keyof ResetPasswordData, value: string) {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
		setGeneralError("")
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		setGeneralError("")

		const validation = ResetPasswordSchema.safeParse(formData)
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
		const result = await resetPasswordConfirm({
			uid,
			token,
			...validation.data,
		})

		if (result.success) {
			router.push("/reset-password/complete")
		} else {
			setGeneralError(result.error)
		}
		setLoading(false)
	}

	return (
		<div className="mx-auto max-w-sm space-y-6 pt-8">
			<div className="space-y-2 text-center">
				<h1 className="text-2xl font-bold">Set New Password</h1>
				<p className="text-sm text-muted-foreground">Enter your new password below.</p>
			</div>

			<form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
				{generalError && (
					<div className="rounded-md bg-destructive p-3 text-sm text-white">{generalError}</div>
				)}

				<div className="space-y-2">
					<label htmlFor="new_password" className="text-sm font-medium">
						New Password
					</label>
					<Input
						id="new_password"
						type="password"
						autoComplete="new-password"
						value={formData.new_password}
						onChange={(e) => handleChange("new_password", e.target.value)}
						required
					/>
					{errors.new_password && <p className="text-xs text-destructive">{errors.new_password}</p>}
				</div>

				<div className="space-y-2">
					<label htmlFor="re_new_password" className="text-sm font-medium">
						Confirm New Password
					</label>
					<Input
						id="re_new_password"
						type="password"
						autoComplete="new-password"
						value={formData.re_new_password}
						onChange={(e) => handleChange("re_new_password", e.target.value)}
						required
					/>
					{errors.re_new_password && (
						<p className="text-xs text-destructive">{errors.re_new_password}</p>
					)}
				</div>

				<Button type="submit" className="w-full" disabled={loading}>
					{loading ? "Resetting..." : "Reset Password"}
				</Button>
			</form>

			<p className="text-center text-sm text-muted-foreground">
				<Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
					Back to sign in
				</Link>
			</p>
		</div>
	)
}

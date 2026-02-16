"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import Link from "next/link"
import { activateAccount } from "@/lib/django-auth"
import { Button } from "@/components/ui/button"

type Status = "loading" | "success" | "error"

export default function ActivateAccountPage({
	params,
}: {
	params: Promise<{ uid: string; token: string }>
}) {
	const { uid, token } = use(params)
	const [status, setStatus] = useState<Status>("loading")
	const [error, setError] = useState("")

	useEffect(() => {
		async function activate() {
			const result = await activateAccount(uid, token)
			if (result.success) {
				setStatus("success")
			} else {
				setError(result.error)
				setStatus("error")
			}
		}
		void activate()
	}, [uid, token])

	return (
		<div className="mx-auto max-w-sm space-y-6 pt-8">
			{status === "loading" && (
				<div className="space-y-4 text-center">
					<h1 className="text-2xl font-bold">Account Activation</h1>
					<p className="text-sm text-muted-foreground">Activating your account...</p>
				</div>
			)}

			{status === "success" && (
				<div className="space-y-4 text-center">
					<h1 className="text-2xl font-bold">Your Account is Active</h1>
					<p className="text-sm text-muted-foreground">
						Thank you! Log in now to sign up for an event or update your profile. If
						you don&apos;t have a GHIN, you will receive one when you join us for the
						current golf season.
					</p>
					<Button asChild className="w-full">
						<Link href="/sign-in">Sign In</Link>
					</Button>
				</div>
			)}

			{status === "error" && (
				<div className="space-y-4 text-center">
					<h1 className="text-2xl font-bold">Activation Failed</h1>
					<div className="rounded-md bg-destructive p-3 text-sm text-white">{error}</div>
					<Link
						href="/sign-in"
						className="text-sm text-primary underline-offset-4 hover:underline"
					>
						Back to sign in
					</Link>
				</div>
			)}
		</div>
	)
}

"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function SentContent() {
	const searchParams = useSearchParams()
	const email = searchParams.get("email")

	return (
		<div className="mx-auto max-w-sm space-y-6 pt-8">
			<div className="space-y-4 text-center">
				<h1 className="text-2xl font-bold">Check Your Email</h1>
				{email && (
					<p className="text-sm text-muted-foreground">
						We sent a password reset link to <strong>{email}</strong>.
					</p>
				)}
				<p className="text-sm text-muted-foreground">
					If you don&apos;t see the email, check your spam or junk folder for an email
					from <strong>postmaster@bhmc.org</strong>.
				</p>
				<p className="text-sm text-muted-foreground">
					If you don&apos;t have an account, you can{" "}
					<Link
						href="/sign-up"
						className="text-primary underline-offset-4 hover:underline"
					>
						create one here
					</Link>
					.
				</p>
			</div>

			<div className="text-center">
				<Link
					href="/sign-in"
					className="text-sm text-primary underline-offset-4 hover:underline"
				>
					Back to sign in
				</Link>
			</div>
		</div>
	)
}

export default function ResetPasswordSentPage() {
	return (
		<Suspense>
			<SentContent />
		</Suspense>
	)
}

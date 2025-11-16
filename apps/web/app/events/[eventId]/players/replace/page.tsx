"use client"

import { useEffect } from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { useSession } from "../../../../../lib/auth-client"

export default function ReplacePlayerPage() {
	const { data: session, isPending } = useSession()
	const signedIn = !!session?.user
	const router = useRouter()

	// Redirect if not authenticated
	useEffect(() => {
		if (!signedIn && !isPending) {
			router.push("/sign-in")
		}
	}, [signedIn, isPending, router])

	if (isPending) {
		return (
			<div className="flex items-center justify-center p-8">
				<span className="loading loading-spinner loading-lg"></span>
			</div>
		)
	}

	if (!signedIn && !isPending) {
		return null // Redirecting
	}

	return (
		<main className="min-h-screen flex justify-center p-8">
			<div className="w-full max-w-3xl">
				<div className="card bg-base-100 shadow-xl">
					<div className="card-body text-center">
						<h2 className="card-title text-2xl font-bold mb-4">Replace Player</h2>
						<p className="text-muted-foreground mb-6">Replace a player with another player.</p>
						<div className="card-actions justify-center">
							<Link href="../players" className="btn btn-primary">
								Back to Players
							</Link>
						</div>
					</div>
				</div>
			</div>
		</main>
	)
}

"use client"

import Link from "next/link"

import { useAuth } from "@/lib/auth-context"

export default function SwapPlayerPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()

	if (isPending) {
		return (
			<div className="flex items-center justify-center p-8">
				<span className="loading loading-spinner loading-lg"></span>
			</div>
		)
	}

	if (!signedIn) {
		return null // Middleware will redirect
	}

	return (
		<main className="min-h-screen flex justify-center p-8">
			<div className="w-full max-w-3xl">
				<div className="card bg-base-100 shadow-xl">
					<div className="card-body text-center">
						<h2 className="card-title text-2xl font-bold mb-4">Swap Players</h2>
						<p className="text-muted-foreground mb-6">
							Swap a player or group with another player or group.
						</p>
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

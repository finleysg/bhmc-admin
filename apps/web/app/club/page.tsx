"use client"

import ActionCard from "@/components/action-card"
import { useAuth } from "@/lib/auth-context"

export default function ClubPage() {
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
			<div className="w-full max-w-5xl">
				<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
					<ActionCard
						title="Membership Report"
						description="View and export membership data"
						href="/club/membership"
						disabled={false}
						icon="📋"
					/>

					<ActionCard
						title="Manage Club Documents"
						description="Upload and organize club documents"
						href="/club/documents"
						disabled={false}
						icon="📁"
					/>

					<ActionCard
						title="Upload Photos"
						description="Add photos to the club gallery"
						href="/club/photos"
						disabled={false}
						icon="📷"
					/>

					<ActionCard
						title="Settings"
						description="Configure club settings"
						href="/club/settings"
						disabled={false}
						icon="⚙️"
					/>
				</div>
			</div>
		</main>
	)
}

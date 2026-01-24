"use client"

import LinkCard from "@/components/link-card"
import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PageLayout } from "@/components/ui/page-layout"

export default function ClubPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()

	if (isPending) {
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null // Middleware will redirect
	}

	return (
		<PageLayout maxWidth="5xl">
			<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				<LinkCard
					title="Membership Report"
					description="View and export membership data"
					href="/club/membership"
					disabled={false}
					icon="📋"
				/>

				<LinkCard
					title="Manage Club Documents"
					description="Upload and organize club documents"
					href="/club/documents"
					disabled={false}
					icon="📁"
				/>

				<LinkCard
					title="Upload Photos"
					description="Add photos to the club gallery"
					href="/club/photos"
					disabled={false}
					icon="📷"
				/>

				<LinkCard
					title="Settings"
					description="Configure club settings"
					href="/club/settings"
					disabled={false}
					icon="⚙️"
				/>
			</div>
		</PageLayout>
	)
}

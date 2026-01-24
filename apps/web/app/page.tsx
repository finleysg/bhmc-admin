"use client"

import { useAuth } from "../lib/auth-context"
import LinkCard from "./components/link-card"
import { PageLayout } from "./components/ui/page-layout"
import { PageHeader } from "./components/ui/page-header"

export default function Home() {
	const { isAuthenticated: signedIn } = useAuth()

	return (
		<PageLayout maxWidth="5xl">
			<PageHeader centered={false} className="text-primary mb-2">
				BHMC Admin
			</PageHeader>
			<p className="text-sm text-muted-foreground mb-6">
				Administrative actions for tournament management
			</p>

			<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
				{!signedIn && (
					<LinkCard
						title="Sign In"
						description="Authenticate to enable admin actions."
						href="/sign-in"
						disabled={false}
						icon={"🔐"}
					/>
				)}

				{signedIn && (
					<>
						<LinkCard
							title="Club Administration"
							description="Manage club-wide settings and members."
							href="/club"
							disabled={false}
							icon={"⛳"}
						/>

						<LinkCard
							title="Event Administration"
							description="Manage tournaments and events."
							href="/events"
							disabled={false}
							icon={"📅"}
						/>
					</>
				)}
			</div>
		</PageLayout>
	)
}

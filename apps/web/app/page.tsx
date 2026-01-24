"use client"

import { useAuth } from "../lib/auth-context"
import ActionCard from "./components/action-card"
import { PageLayout } from "./components/ui/page-layout"

export default function Home() {
	const { isAuthenticated: signedIn } = useAuth()

	return (
		<PageLayout maxWidth="5xl">
			<h1 className="text-4xl font-bold text-primary mb-2">BHMC Admin</h1>
			<p className="text-sm text-muted-foreground mb-6">
				Administrative actions for tournament management
			</p>

			<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
				{!signedIn && (
					<ActionCard
						title="Sign In"
						description="Authenticate to enable admin actions."
						href="/sign-in"
						disabled={false}
						icon={"🔐"}
					/>
				)}

				{signedIn && (
					<>
						<ActionCard
							title="Club Administration"
							description="Manage club-wide settings and members."
							href="/club"
							disabled={false}
							icon={"⛳"}
						/>

						<ActionCard
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

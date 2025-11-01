"use client"

import { useSession } from "../lib/auth-client"
import ActionCard from "./components/action-card"

export default function Home() {
	const { data: session } = useSession()
	const signedIn = !!session?.user

	return (
		<main className="min-h-screen flex items-center justify-center p-8">
			<div className="w-full max-w-5xl">
				<h1 className="text-4xl font-bold text-primary mb-2">BHMC Admin</h1>
				<p className="text-sm text-muted-foreground mb-6">
					Administrative actions for tournament management
				</p>

				<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
					<ActionCard
						title="Event Management"
						description="Create and manage events, players, and schedules."
						href="/events"
						disabled={!signedIn}
						icon={"🎯"}
					/>

					<ActionCard
						title="Golf Genius Integration"
						description="Configure and sync with Golf Genius."
						href="/golf-genius"
						disabled={!signedIn}
						icon={"🏌️‍♂️"}
					/>

					<ActionCard
						title="Event Reporting"
						description="View reports and export event data."
						href="/reports"
						disabled={!signedIn}
						icon={"📊"}
					/>

					{!signedIn && (
						<ActionCard
							title="Sign In"
							description="Authenticate to enable admin actions."
							href="/sign-in"
							disabled={false}
							icon={"🔐"}
						/>
					)}
				</div>
			</div>
		</main>
	)
}

"use client"

import { useSession } from "../lib/auth-client"
import ActionCard from "./components/action-card"

export default function Home() {
	const { data: session } = useSession()
	const signedIn = !!session?.user

	return (
		<main className="min-h-screen flex justify-center p-8">
			<div className="w-full max-w-5xl">
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
			</div>
		</main>
	)
}

import Link from "next/link"
import { notFound } from "next/navigation"

import type { InspectorSearchResult } from "@repo/domain/types"

import { formatClubDateTime } from "@/lib/club-time"
import { apiGet } from "@/lib/server-api"

import { InspectorSearch } from "./components/inspector-search"

/** Registration Inspector: the event's registrations, optionally narrowed to a player (Event Admin). */
export default async function InspectorSearchPage({
	params,
	searchParams,
}: {
	params: Promise<{ eventId: string }>
	searchParams: Promise<{ q?: string }>
}) {
	const eventId = Number((await params).eventId)
	if (!Number.isInteger(eventId)) notFound()
	const { q = "" } = await searchParams
	const query = q.trim()

	const search = query ? `?${new URLSearchParams({ q: query })}` : ""
	const results = await apiGet<InspectorSearchResult[]>(
		`/registration-inspector/events/${eventId}/search${search}`,
	)

	return (
		<div className="mx-auto max-w-5xl space-y-6 md:py-8">
			<h3 className="font-heading text-2xl font-bold">Registration Inspector</h3>
			<InspectorSearch query={q} />
			{results.length === 0 ? (
				<p className="py-8 text-center text-muted-foreground">
					{query ? "No registrations found" : "This event has no registrations"}
				</p>
			) : (
				<ul className="divide-y rounded-md border bg-card">
					{results.map((r) => (
						<li key={r.registrationId}>
							<Link
								href={`/events/${eventId}/inspector/${r.registrationId}`}
								className="block space-y-1 px-4 py-3 hover:bg-accent"
							>
								<div className="font-medium text-primary">
									{r.players.length ? r.players.join(", ") : "No players on slots"}
								</div>
								<div className="text-xs text-muted-foreground">
									Registration {r.registrationId}
									{r.signedUpBy && ` · signed up by ${r.signedUpBy}`} ·{" "}
									{formatClubDateTime(r.createdDate)}
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

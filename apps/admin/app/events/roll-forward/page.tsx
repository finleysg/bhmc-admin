import Link from "next/link"
import { redirect } from "next/navigation"

import type { RollForwardPreview } from "@repo/domain/types"

import { Button } from "@/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card"
import { apiRequest } from "@/lib/server-api"

import { SeasonSelect } from "../components/season-select"

import { RollForwardForm } from "./components/roll-forward-form"

/** Season roll-forward: next season's events from a source season's (Event Admin). */
export default async function RollForwardPage({
	searchParams,
}: {
	searchParams: Promise<{ season?: string }>
}) {
	const requested = Number((await searchParams).season)
	const fromSeason =
		Number.isInteger(requested) && requested > 0 ? requested : new Date().getFullYear()
	const toSeason = fromSeason + 1

	const result = await apiRequest<RollForwardPreview>("/seasons/roll-forward/preview", "POST", {
		fromSeason,
		toSeason,
	})
	if (!result.ok) {
		if (result.status === 403) redirect("/restricted")
		throw new Error(result.message)
	}

	return (
		<div className="mx-auto max-w-5xl space-y-4 md:py-8">
			<div className="flex items-center justify-between">
				<h2 className="font-heading text-2xl font-bold">Roll forward a season</h2>
				<Button asChild variant="outline">
					<Link href={`/events?season=${fromSeason}`}>Cancel</Link>
				</Button>
			</div>
			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<div className="space-y-1.5">
						<CardTitle>
							{fromSeason} → {toSeason}
						</CardTitle>
						<CardDescription>
							Each event is proposed 364 days later, on the same weekday. Its signup, priority
							signup, and payment deadlines keep their offsets from the event date. Settings,
							courses, fees, and sessions are copied, and slots are created where players choose
							them. Every new event is Scheduled, without a Golf Genius ID or portal and external
							links. Registrations, results, documents, and photos are never copied.
						</CardDescription>
					</div>
					<SeasonSelect season={fromSeason} />
				</CardHeader>
				<CardContent>
					{result.data.events.length === 0 ? (
						<p className="py-8 text-center text-muted-foreground">
							The {fromSeason} season has no events.
						</p>
					) : (
						<RollForwardForm key={fromSeason} preview={result.data} />
					)}
				</CardContent>
			</Card>
		</div>
	)
}

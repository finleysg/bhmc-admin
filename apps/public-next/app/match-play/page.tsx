export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { fetchDjango } from "@/lib/fetchers"
import { currentSeason } from "@/lib/constants"
import { EventType, getEventUrl } from "@/lib/event-utils"
import type { ClubEventDetail } from "@/lib/types"

export default async function MatchPlayPage() {
	const events = await fetchDjango<ClubEventDetail[]>(`/events/?season=${currentSeason}`, {
		revalidate: 300,
		tags: ["events"],
	})

	const matchPlayEvent = events.find((e) => e.event_type === EventType.MatchPlay)

	if (matchPlayEvent) {
		redirect(getEventUrl(matchPlayEvent))
	}

	return (
		<div>
			<p className="text-muted-foreground">No match play event found for {currentSeason}.</p>
		</div>
	)
}

export const dynamic = "force-dynamic"

import { fetchDjango } from "@/lib/fetchers"
import { currentSeason } from "@/lib/constants"
import { slugify } from "@/lib/slugify"
import { isoDayFormat } from "@/lib/date-utils"
import { parse } from "date-fns"
import type { ClubEvent, PageContent } from "@/lib/types"
import { MembershipContent } from "./membership-content"

export default async function MembershipPage() {
	const [contentArr, events] = await Promise.all([
		fetchDjango<PageContent[]>("/page-content/?key=membership"),
		fetchDjango<ClubEvent[]>(`/events/?season=${currentSeason}`, { tags: ["events"] }),
	])

	const content = contentArr[0]

	const membershipEvent = events.filter((e) => e.event_type === "R").slice(-1)[0]
	let eventUrl: string | null = null
	if (membershipEvent) {
		const startDate = parse(membershipEvent.start_date, "yyyy-MM-dd", new Date())
		eventUrl = `/event/${isoDayFormat(startDate)}/${slugify(membershipEvent.name)}`
	}

	return (
		<MembershipContent
			title={content?.title ?? "Membership"}
			content={content?.content ?? ""}
			eventUrl={eventUrl}
		/>
	)
}

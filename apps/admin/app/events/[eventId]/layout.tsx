import { notFound } from "next/navigation"

import { parseLocalDate } from "@repo/domain/functions"
import type { ClubEvent } from "@repo/domain/types"

import { apiGet } from "@/lib/server-api"

export default async function EventLayout({
	children,
	params,
}: {
	children: React.ReactNode
	params: Promise<{ eventId: string }>
}) {
	const eventId = Number((await params).eventId)
	if (!Number.isInteger(eventId)) notFound()

	// The setup read works for events that are not complete yet (no fees or courses).
	const event = await apiGet<ClubEvent>(`/events/${eventId}/setup`)
	const date = parseLocalDate(event.startDate).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	})

	return (
		<div>
			<div className="flex justify-center pt-4 md:px-8 md:pt-8">
				<div className="w-full max-w-3xl px-4 md:px-0">
					<h2 className="mb-4 text-center text-xl font-bold text-primary">
						{date}: {event.name}
					</h2>
				</div>
			</div>
			{children}
		</div>
	)
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PendingEventCardProps {
	eventName: string
	eventDate: string
}

export function PendingEventCard({ eventName, eventDate }: PendingEventCardProps) {
	const formattedDate = new Date(eventDate + "T12:00:00").toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	})

	return (
		<Card className="h-full border-dashed">
			<CardHeader className="pb-2">
				<div className="flex items-baseline justify-between">
					<CardTitle className="text-base">{eventName}</CardTitle>
					<span className="text-xs text-muted-foreground">{formattedDate}</span>
				</div>
			</CardHeader>
			<CardContent>
				<span className="rounded-full bg-secondary/20 px-2 py-0.5 text-xs font-medium text-secondary">
					Registered
				</span>
			</CardContent>
		</Card>
	)
}

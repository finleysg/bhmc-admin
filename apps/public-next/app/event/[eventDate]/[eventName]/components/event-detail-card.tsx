import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Markdown } from "@/components/markdown"
import { EventTypeIndicator } from "@/components/event-type-indicator"
import {
	EventStatusType,
	RegistrationType,
	getStartTypeName,
	getRegistrationTypeName,
} from "@/lib/event-utils"
import { dayAndDateFormat, dayDateAndTimeFormat, parseApiDate } from "@/lib/date-utils"
import type { ClubEventDetail } from "@/lib/types"

interface EventDetailCardProps {
	event: ClubEventDetail
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="grid grid-cols-[5.5rem_1fr] gap-2 sm:grid-cols-[10rem_1fr]">
			<span className="font-medium text-secondary">{label}</span>
			<span>{children}</span>
		</div>
	)
}

export function EventDetailCard({ event }: EventDetailCardProps) {
	const startDate = parseApiDate(event.start_date)
	const isCanceled = event.status === EventStatusType.Canceled
	const startType = getStartTypeName(event.start_type)
	const registrationType = getRegistrationTypeName(event.registration_type)
	const hasSignup =
		event.registration_type !== RegistrationType.None &&
		event.signup_start &&
		event.signup_end

	return (
		<Card>
			<CardHeader>
				{isCanceled && (
					<Badge variant="destructive" className="mb-2 w-fit">
						Canceled
					</Badge>
				)}
				<CardTitle className="text-2xl">{event.name}</CardTitle>
				<EventTypeIndicator eventType={event.event_type} className="w-fit" />
			</CardHeader>
			<CardContent className="space-y-4">
				<hr className="border-muted-foreground/25" />
				<div className="space-y-1 text-sm">
					<DetailRow label="Event date:">
						<span className="font-bold">{dayAndDateFormat(startDate)}</span>
					</DetailRow>
					{event.start_time && (
						<DetailRow label="Start:">
							{event.start_time} {startType}
						</DetailRow>
					)}
					{registrationType && (
						<DetailRow label=" ">{registrationType}</DetailRow>
					)}
				</div>

				{hasSignup && (
					<>
						<hr className="border-muted-foreground/25" />
						<div className="space-y-1 text-sm">
							<h3 className="mb-2 font-heading text-lg font-semibold text-secondary">
								Signup Times
							</h3>
							<DetailRow label="Open:">
								{dayDateAndTimeFormat(event.priority_signup_start ?? event.signup_start)}
							</DetailRow>
							<DetailRow label="Close:">
								{dayDateAndTimeFormat(event.signup_end)}
							</DetailRow>
							{event.payments_end && (
								<DetailRow label="Changes:">
									{dayDateAndTimeFormat(event.payments_end)}
								</DetailRow>
							)}
						</div>
					</>
				)}

				<hr className="border-muted-foreground/25" />

				{event.portal_url && (
					<div>
						<a
							href={event.portal_url}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-primary underline"
						>
							Golf Genius Portal
						</a>
					</div>
				)}

				{event.notes && (
					<>
						<h3 className="font-heading text-lg font-semibold text-secondary">
							Notes / Format
						</h3>
						<Markdown content={event.notes} />
					</>
				)}
			</CardContent>
		</Card>
	)
}

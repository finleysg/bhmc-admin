import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Markdown } from "@/components/markdown"
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
	actions?: React.ReactNode
	banner?: React.ReactNode
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="grid grid-cols-[5.5rem_1fr] gap-2 sm:grid-cols-[10rem_1fr]">
			<span className="font-medium text-secondary">{label}</span>
			<span>{children}</span>
		</div>
	)
}

export function EventDetailCard({ event, actions, banner }: EventDetailCardProps) {
	const startDate = parseApiDate(event.start_date)
	const isCanceled = event.status === EventStatusType.Canceled
	const startType = getStartTypeName(event.start_type)
	const registrationType = getRegistrationTypeName(event.registration_type)
	const hasSignup =
		event.registration_type !== RegistrationType.None && event.signup_start && event.signup_end

	return (
		<Card>
			<CardHeader>
				{isCanceled && (
					<Badge variant="destructive" className="mb-2 w-fit">
						Canceled
					</Badge>
				)}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
					<CardTitle className="text-2xl text-primary">{event.name}</CardTitle>
					{actions}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{banner}
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
					{registrationType && <DetailRow label=" ">{registrationType}</DetailRow>}
				</div>

				{hasSignup && (
					<>
						<hr className="border-muted-foreground/25" />
						<div className="space-y-1 text-sm">
							<h3 className="mb-2 font-heading text-lg font-semibold text-primary">Signup Times</h3>
							<DetailRow label="Open:">
								{dayDateAndTimeFormat(event.priority_signup_start ?? event.signup_start)}
							</DetailRow>
							<DetailRow label="Close:">{dayDateAndTimeFormat(event.signup_end)}</DetailRow>
							{event.payments_end && (
								<DetailRow label="Changes:">{dayDateAndTimeFormat(event.payments_end)}</DetailRow>
							)}
						</div>
					</>
				)}

				<hr className="border-muted-foreground/25" />

				{event.notes && (
					<>
						<h3 className="font-heading text-lg font-semibold text-primary">Notes / Format</h3>
						<Markdown content={event.notes} />
					</>
				)}
			</CardContent>
		</Card>
	)
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { fetchDjango } from "@/lib/fetchers"
import { RegistrationType, computeOpenSpots, type SessionSpots } from "@/lib/event-utils"
import type { ClubEventDetail, EventSession, RegistrationSlot } from "@/lib/types"

interface FeesAndPointsCardProps {
	event: ClubEventDetail
	openSpots?: number
	sessionSpots?: SessionSpots[]
}

function SessionFees({ event, session }: { event: ClubEventDetail; session: EventSession }) {
	const fees = event.fees ?? []
	const overrideMap = new Map(session.fee_overrides.map((o) => [o.event_fee, o.amount]))

	return (
		<div className="space-y-1">
			<p className="text-xs font-semibold text-secondary">{session.name}</p>
			{fees.map((fee) => {
				const overrideAmount = overrideMap.get(fee.id)
				const displayAmount = overrideAmount ?? fee.amount
				return (
					<div key={fee.id} className="flex items-center justify-between text-sm">
						<span>
							{fee.fee_type.name}
							{fee.is_required && <span className="text-xs text-muted-foreground"> *</span>}
						</span>
						<span className="font-medium">${displayAmount}</span>
					</div>
				)
			})}
		</div>
	)
}

export async function FeesAndPointsCard({
	event,
	openSpots: precomputedSpots,
	sessionSpots,
}: FeesAndPointsCardProps) {
	const fees = event.fees ?? []
	const sessions = event.sessions ?? []
	const hasSessions = sessions.length > 0

	let openSpots = precomputedSpots ?? -1
	const hasRegistration = event.registration_type !== RegistrationType.None
	if (precomputedSpots === undefined && hasRegistration && event.registration_window !== "past") {
		try {
			const slots = await fetchDjango<RegistrationSlot[]>(
				`/registration-slots/?event_id=${event.id}`,
				{ revalidate: 60, tags: [`event-slots-${event.id}`] },
			)
			openSpots = computeOpenSpots(event, slots)
		} catch {
			// If slots can't be fetched, skip showing spots
		}
	}
	const showSpots = hasRegistration && event.registration_window !== "past" && openSpots !== -1

	if (fees.length === 0 && !event.season_points && !event.group_size && !showSpots) {
		return null
	}

	// Determine if any session has fee overrides
	const hasSessionOverrides = sessions.some((s) => s.fee_overrides.length > 0)

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-md font-heading text-primary">Fees & Points</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				{fees.length > 0 && hasSessions && hasSessionOverrides ? (
					<div className="space-y-3">
						{sessions
							.slice()
							.sort((a, b) => a.display_order - b.display_order)
							.map((session, idx) => (
								<div key={session.id}>
									{idx > 0 && <Separator className="mb-2" />}
									<SessionFees event={event} session={session} />
								</div>
							))}
					</div>
				) : (
					fees.length > 0 && (
						<div className="space-y-1">
							{fees.map((fee) => (
								<div key={fee.id} className="flex items-center justify-between text-sm">
									<span>
										{fee.fee_type.name}
										{fee.is_required && <span className="text-xs text-muted-foreground"> *</span>}
									</span>
									<span className="font-medium">${fee.amount}</span>
								</div>
							))}
							{fees
								.filter((fee) => fee.override_amount && fee.override_restriction)
								.map((fee) => (
									<div
										key={`${fee.id}-override`}
										className="flex items-center justify-between text-sm"
									>
										<span>
											{fee.fee_type.name} ({fee.override_restriction})
										</span>
										<span className="font-medium">${fee.override_amount}</span>
									</div>
								))}
						</div>
					)
				)}
				{(event.season_points || event.group_size || showSpots) && fees.length > 0 && <Separator />}
				{event.season_points && (
					<div className="flex items-center justify-between text-sm">
						<span>Season Points</span>
						<span className="font-medium">{event.season_points}x</span>
					</div>
				)}
				{event.group_size && (
					<div className="flex items-center justify-between text-sm">
						<span>Group Size</span>
						<span className="font-medium">{event.group_size}</span>
					</div>
				)}
				{showSpots && !hasSessions && (
					<div className="flex items-center justify-between text-sm">
						<span>Spots Available</span>
						<span className="font-medium">{openSpots}</span>
					</div>
				)}
				{hasSessions && sessionSpots && sessionSpots.length > 0 && (
					<>
						{fees.length > 0 && <Separator />}
						<div className="space-y-1">
							{sessionSpots.map((s) => (
								<div key={s.sessionId} className="flex items-center justify-between text-sm">
									<span>{s.sessionName}</span>
									<span className="font-medium">
										{s.availableSpots <= 0 ? "Full" : `${s.availableSpots} of ${s.totalSpots}`}
									</span>
								</div>
							))}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	)
}

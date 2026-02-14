import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { fetchDjango } from "@/lib/fetchers"
import { RegistrationType } from "@/lib/event-utils"
import type { ClubEventDetail, RegistrationSlot } from "@/lib/types"

interface FeesAndPointsCardProps {
	event: ClubEventDetail
}

function computeOpenSpots(event: ClubEventDetail, slots: RegistrationSlot[]): number {
	if (event.can_choose) {
		const filled = slots.filter((s) => s.status !== "A").length
		return slots.length - filled
	}
	const filled = slots.filter((s) => s.status === "R").length
	if (event.registration_maximum) {
		return event.registration_maximum - filled
	}
	return -1
}

export async function FeesAndPointsCard({ event }: FeesAndPointsCardProps) {
	const fees = event.fees ?? []

	let openSpots = -1
	const hasRegistration = event.registration_type !== RegistrationType.None
	if (hasRegistration && event.registration_window !== "past") {
		try {
			const slots = await fetchDjango<RegistrationSlot[]>(
				`/registration-slots/?event_id=${event.id}`,
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

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-md font-heading text-primary">Fees & Points</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				{fees.length > 0 && (
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
					</div>
				)}
				{(event.season_points || event.group_size || showSpots) && fees.length > 0 && (
					<Separator />
				)}
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
				{showSpots && (
					<div className="flex items-center justify-between text-sm">
						<span>Spots Available</span>
						<span className="font-medium">{openSpots}</span>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
